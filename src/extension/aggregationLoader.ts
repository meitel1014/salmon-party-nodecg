import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV } from './csvLoader';
import {
  createGoogleAuth,
  extractSpreadsheetId,
  findCredentialsFile,
  getSpreadsheet,
  resolveWorksheet,
} from './googleSheetsClient';
import { normalizeTeamName } from '../teamName';
import type { AggregationRow, DataSourceConfig } from '../schemas';

export interface AggregationLoadResult {
  rows: AggregationRow[];
  /** シナリオ番号が数値でない等で読み飛ばした行数 */
  skipped: number;
  /** 「チーム名→◯◯ / シナリオ→◯◯ / 合計金イクラ納品数→◯◯ / …」。列解決の目視確認用 */
  resolvedColumns: string;
  warnings: string[];
}

// ─── 列解決 ────────────────────────────────────────────────

/**
 * ヘッダー名から列を解決する。読むのは常に次の 4 列だけで、他の列は無視する。
 *
 * 基準は `集計.csv`（= 集計bot のシート）のヘッダー名
 * （`... / チーム名 / シナリオ / 合計金イクラ納品数 / 合計赤イクラ取得数 / ...`）。
 * Googleフォームの回答シートも、設問文をこの名前に揃えれば同じルールで読める。
 *
 * 照合は**完全一致のみ**（trim 後）。部分一致を許すとフォームの注意書き列を
 * 誤って拾いうるため、代わりに別名を候補として明示列挙する。
 * 候補は書いた順に試し、一度使った列は他のキーの候補から除外する。
 */
const COLUMN_PATTERNS = [
  { key: 'teamName', label: 'チーム名', candidates: ['チーム名', 'チーム'] },
  { key: 'scenario', label: 'シナリオ', candidates: ['シナリオ', 'シナリオ番号'] },
  {
    key: 'goldenEgg',
    label: '合計金イクラ納品数',
    candidates: ['合計金イクラ納品数', '金イクラ納品数', '金イクラ'],
  },
  {
    key: 'redEgg',
    label: '合計赤イクラ取得数',
    candidates: ['合計赤イクラ取得数', '赤イクラ取得数', '赤イクラ納品数', '赤イクラ'],
  },
] as const;

type ColumnKey = (typeof COLUMN_PATTERNS)[number]['key'];

export interface ResolvedColumns {
  indexes: Record<ColumnKey, number>;
  description: string;
}

export function resolveColumns(headers: string[]): ResolvedColumns {
  const used = new Set<number>();
  const indexes = {} as Record<ColumnKey, number>;
  const parts: string[] = [];

  for (const { key, label, candidates } of COLUMN_PATTERNS) {
    let found = -1;
    for (const candidate of candidates) {
      found = headers.findIndex((h, i) => !used.has(i) && h.trim() === candidate);
      if (found !== -1) break;
    }
    if (found === -1) {
      throw new Error(
        `「${label}」の列が見つかりません（受け付ける列名: ${candidates.join(' / ')}）。` +
        `ヘッダー: ${headers.join(' / ') || '(なし)'}`
      );
    }
    used.add(found);
    indexes[key] = found;
    parts.push(`${label}→${headers[found].trim()}`);
  }

  return { indexes, description: parts.join(' / ') };
}

// ─── 行の正規化 ────────────────────────────────────────────

/**
 * 読むのは 4 列だけなので、同一チーム×シナリオが複数行あるときは
 * **後の行を採用**する（タイムスタンプ列は参照しない）。
 * フォームの再送信による訂正も、bot の書き直しも、後の行が新しいという前提で揃える。
 */
function normalizeRows(
  dataRows: string[][],
  columns: ResolvedColumns
): { rows: AggregationRow[]; skipped: number; deduped: number } {
  const { teamName: tIdx, scenario: sIdx, goldenEgg: gIdx, redEgg: rIdx } = columns.indexes;
  const cell = (row: string[], i: number) => (row[i] ?? '').trim();

  let skipped = 0;
  let deduped = 0;
  // 「チーム名|シナリオ番号」をキーに、最後に現れた行だけを保持する。
  // 初出の行順を order に覚えておき、出力順は元シートの並びを保つ。
  const latest = new Map<string, { row: AggregationRow; order: number }>();

  dataRows.forEach((raw, order) => {
    const teamName = cell(raw, tIdx);
    const scenarioText = cell(raw, sIdx);
    // チーム名もシナリオも空の行は末尾の空行とみなし、スキップ数に数えない
    if (!teamName && !scenarioText) return;

    const scenarioNumber = Number(scenarioText);
    if (!teamName || !scenarioText || !Number.isFinite(scenarioNumber)) {
      skipped++;
      return;
    }

    const row: AggregationRow = {
      teamName,
      scenarioNumber,
      goldenEgg: Number(cell(raw, gIdx)) || 0,
      redEgg: Number(cell(raw, rIdx)) || 0,
    };

    const key = `${normalizeTeamName(teamName)}|${scenarioNumber}`;
    const prev = latest.get(key);
    if (prev) {
      deduped++;
      // 値だけ差し替え、表示順は初出の位置に留める
      latest.set(key, { row, order: prev.order });
    } else {
      latest.set(key, { row, order });
    }
  });

  const rows = [...latest.values()].sort((a, b) => a.order - b.order).map((v) => v.row);
  return { rows, skipped, deduped };
}

// ─── データソース別の読み込み ───────────────────────────────

const AGGREGATION_CSV = '集計.csv';

/** 同一チーム×シナリオを集約した件数の警告文。0 件なら警告なし。 */
function dedupeWarnings(deduped: number): string[] {
  return deduped > 0
    ? [`同一チーム×シナリオの重複 ${deduped} 件を、後に現れた行の値に集約しました。`]
    : [];
}

function loadFromCsv(bundlePath: string): AggregationLoadResult {
  const table = parseCSV(readFileSync(join(bundlePath, 'data', AGGREGATION_CSV), 'utf8'));
  if (table.length === 0) {
    throw new Error(`${AGGREGATION_CSV} が空です`);
  }
  const columns = resolveColumns(table[0]);
  const { rows, skipped, deduped } = normalizeRows(table.slice(1), columns);
  return {
    rows,
    skipped,
    resolvedColumns: columns.description,
    warnings: dedupeWarnings(deduped),
  };
}

async function loadFromSheet(
  config: DataSourceConfig,
  bundlePath: string
): Promise<AggregationLoadResult> {
  const spreadsheetId = extractSpreadsheetId(config.url);
  const auth = createGoogleAuth(findCredentialsFile(bundlePath));
  const doc = await getSpreadsheet(spreadsheetId, auth);
  const sheet = resolveWorksheet(doc, config.sheetTitle.trim());

  const sheetRows = await sheet.getRows();
  const headers = sheet.headerValues ?? [];
  const columns = resolveColumns(headers);
  const table = sheetRows.map((row) => headers.map((h) => String(row.get(h) ?? '')));

  const warnings: string[] = [];
  const duplicated = headers.filter((h, i) => h && headers.indexOf(h) !== i);
  if (duplicated.length > 0) {
    warnings.push(`ヘッダー名が重複しています: ${[...new Set(duplicated)].join(' / ')}`);
  }

  const { rows, skipped, deduped } = normalizeRows(table, columns);
  warnings.push(...dedupeWarnings(deduped));

  return { rows, skipped, resolvedColumns: columns.description, warnings };
}

/**
 * データソース設定に従って集計データを読み込む。
 * 呼び出し側が配信中のデータを壊さず判断できるよう、throw せず結果かエラーを返す。
 */
export async function loadAggregation(
  config: DataSourceConfig,
  bundlePath: string
): Promise<{ ok: true; data: AggregationLoadResult } | { ok: false; error: string }> {
  try {
    const data = config.type === 'csv'
      ? loadFromCsv(bundlePath)
      : await loadFromSheet(config, bundlePath);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
