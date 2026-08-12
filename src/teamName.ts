import type { BroadcastRow } from './schemas';

/**
 * チーム名を突合キーに正規化する。
 *
 * 集計データ側のチーム名はデータソースによって入力経路が異なり（Googleフォームは自由入力）、
 * 全角/半角・前後空白・語中の空白でブレる。一方 broadcastSchedule 側は手書き CSV 由来。
 * 完全一致で突合するとメンバー欄が無言で空になるため、キーだけ正規化する。
 * 表示に使う文字列は元のまま保持すること。
 */
export function normalizeTeamName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, '');
}

/**
 * 指定シナリオの broadcastSchedule を「正規化チーム名 → 行」の索引にする。
 * 同名が複数ある場合は最初の行を採用する。
 */
export function buildTeamRowIndex(
  broadcastSchedule: readonly BroadcastRow[],
  scenarioNumber: number
): Map<string, BroadcastRow> {
  const index = new Map<string, BroadcastRow>();
  for (const row of broadcastSchedule) {
    if (row.scenarioNumber !== scenarioNumber) continue;
    const key = normalizeTeamName(row.teamName);
    if (!index.has(key)) index.set(key, row);
  }
  return index;
}
