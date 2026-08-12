import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import type { BroadcastRow, ScenarioInfo } from '../schemas';

export interface CsvData {
  broadcastSchedule: BroadcastRow[];
  scenarioList: ScenarioInfo[];
  warnings: string[];
}

// ─── CSV パース ────────────────────────────────────────────

/**
 * CSV を string[][] にパースする。
 *
 * 集計データはスプレッドシートからのエクスポートであり、Discord 表示名などの列に
 * カンマが入りうる。素朴な split(',') だと列が1つずれて別チームのスコアを
 * 無言でランキングしてしまうため、クォート対応のパーサを使う。
 */
export function parseCSV(content: string): string[][] {
  return parse(content, {
    bom: true,
    // 配信卓.csv のように末尾列が省略される行があるため、列数不一致で throw させない
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false,
  }) as string[][];
}

export function readCSV(filePath: string): string[][] {
  return parseCSV(readFileSync(filePath, 'utf8'));
}

// ─── 各 CSV 読み込み ───────────────────────────────────────

function loadScenarioList(dataDir: string): ScenarioInfo[] {
  // ルール.csv: シナリオ番号, ルール, シナリオ名_表示用, 部
  return readCSV(join(dataDir, 'ルール.csv'))
    .slice(1)
    .filter((row) => row.length >= 4 && !isNaN(Number(row[0].trim())))
    .map((row) => ({
      scenarioNumber: Number(row[0].trim()),
      rule: row[1].trim(),
      displayName: row[2].trim(),
      section: row[3].trim(),
    }));
}

function loadBroadcastTable(dataDir: string): {
  tableMap: Map<number, string>;
  displayNames: Record<number, string>;
} {
  // 配信卓.csv: シナリオ番号, チーム名, シナリオ表示名(省略可)
  const tableMap = new Map<number, string>();
  const displayNames: Record<number, string> = {};
  for (const row of readCSV(join(dataDir, '配信卓.csv')).slice(1)) {
    if (row.length < 2) continue;
    const n = Number(row[0].trim());
    if (isNaN(n)) continue;
    tableMap.set(n, row[1].trim());
    const name = row[2]?.trim();
    if (name) displayNames[n] = name;
  }
  return { tableMap, displayNames };
}

function loadZenhanRows(
  dataDir: string,
  scenarioList: ScenarioInfo[],
  tableMap: Map<number, string>,
  displayNames: Record<number, string>,
): BroadcastRow[] {
  // 前半チーム情報.csv: シナリオ番号, チーム名, プレイヤー1-4
  return readCSV(join(dataDir, '前半チーム情報.csv'))
    .slice(1)
    .filter((row) => row.length >= 6 && !isNaN(Number(row[0].trim())))
    .map((row) => {
      const scenarioNumber = Number(row[0].trim());
      const teamName = row[1].trim();
      const players = [
        row[2].trim(), row[3].trim(), row[4].trim(), row[5].trim(),
      ] as [string, string, string, string];
      const rule = scenarioList.find((s) => s.scenarioNumber === scenarioNumber)?.rule ?? '';
      return {
        scenarioNumber,
        teamName,
        displayTeamName: displayNames[scenarioNumber] ?? teamName,
        players,
        rule,
        isBroadcastTable: tableMap.get(scenarioNumber) === teamName,
      };
    });
}

function loadKohanTeams(dataDir: string): { teamName: string; players: [string, string, string, string] }[] {
  // 後半チーム情報.csv: チーム名, プレイヤー1-4
  return readCSV(join(dataDir, '後半チーム情報.csv'))
    .slice(1)
    .filter((row) => row.length >= 5)
    .map((row) => ({
      teamName: row[0].trim(),
      players: [row[1].trim(), row[2].trim(), row[3].trim(), row[4].trim()] as [string, string, string, string],
    }));
}

function loadKyukeiRows(dataDir: string): {
  scenarioEntries: ScenarioInfo[];
  scheduleRows: BroadcastRow[];
} {
  // 休憩企画.csv: チーム名, ルール, プレイヤー1-4 (1行=1シナリオ、番号は 101 から採番)
  const rows = readCSV(join(dataDir, '休憩企画.csv'))
    .slice(1)
    .filter((row) => row.length >= 6)
    .map((row, i) => ({
      scenarioNumber: 101 + i,
      teamName: row[0].trim(),
      rule: row[1].trim(),
      players: [row[2].trim(), row[3].trim(), row[4].trim(), row[5].trim()] as [string, string, string, string],
    }));

  return {
    scenarioEntries: rows.map((r) => ({
      scenarioNumber: r.scenarioNumber,
      displayName: r.teamName,
      rule: r.rule,
      section: '休憩企画',
    })),
    scheduleRows: rows.map((r) => ({
      scenarioNumber: r.scenarioNumber,
      teamName: r.teamName,
      displayTeamName: r.teamName,
      players: r.players,
      rule: r.rule,
      isBroadcastTable: true,
    })),
  };
}

// ─── 整合性チェック ────────────────────────────────────────

function checkIntegrity(
  scenarioList: ScenarioInfo[],
  tableMap: Map<number, string>,
  zenhanRows: BroadcastRow[],
  kohanTeams: { teamName: string }[],
): string[] {
  const warnings: string[] = [];

  const zenhanTeamSet = new Map<number, Set<string>>();
  for (const row of zenhanRows) {
    if (row.scenarioNumber === null) continue;
    if (!zenhanTeamSet.has(row.scenarioNumber)) zenhanTeamSet.set(row.scenarioNumber, new Set());
    zenhanTeamSet.get(row.scenarioNumber)!.add(row.teamName);
  }
  const kohanTeamSet = new Set(kohanTeams.map((t) => t.teamName));

  for (const [scenarioNum, teamName] of tableMap) {
    const scenario = scenarioList.find((s) => s.scenarioNumber === scenarioNum);
    if (!scenario) {
      warnings.push(`配信卓.csv: シナリオ番号 ${scenarioNum} がルール.csv に存在しません`);
      continue;
    }
    if (scenario.section === '前半' && !zenhanTeamSet.get(scenarioNum)?.has(teamName)) {
      warnings.push(`配信卓.csv: シナリオ${scenarioNum} のチーム「${teamName}」が前半チーム情報.csv に存在しません`);
    } else if (scenario.section === '後半' && !kohanTeamSet.has(teamName)) {
      warnings.push(`配信卓.csv: チーム「${teamName}」が後半チーム情報.csv に存在しません`);
    }
  }

  const missingRuleScenarios = new Set(
    zenhanRows
      .filter((row) => !row.rule && row.scenarioNumber !== null)
      .map((row) => row.scenarioNumber)
  );
  for (const scenarioNumber of missingRuleScenarios) {
    warnings.push(`前半チーム情報.csv: シナリオ番号 ${scenarioNumber} のルールがルール.csv に存在しません`);
  }

  return warnings;
}

// ─── エントリポイント ─────────────────────────────────────

export function loadCsvData(bundlePath: string): CsvData {
  const dataDir = join(bundlePath, 'data');

  const scenarioList = loadScenarioList(dataDir);

  const conflicting = scenarioList.find((s) => s.scenarioNumber >= 101);
  if (conflicting) {
    throw new Error(
      `ルール.csv: シナリオ番号 ${conflicting.scenarioNumber} は 101 以上のため休憩企画と衝突します`
    );
  }

  const { tableMap, displayNames } = loadBroadcastTable(dataDir);
  const zenhanRows = loadZenhanRows(dataDir, scenarioList, tableMap, displayNames);
  const kohanTeams = loadKohanTeams(dataDir);
  const { scenarioEntries: kyukeiScenarios, scheduleRows: kyukeiRows } = loadKyukeiRows(dataDir);

  const kohanRows: BroadcastRow[] = scenarioList
    .filter((s) => s.section === '後半')
    .flatMap((scenario) =>
      kohanTeams.map((team) => ({
        scenarioNumber: scenario.scenarioNumber,
        teamName: team.teamName,
        displayTeamName: displayNames[scenario.scenarioNumber] ?? team.teamName,
        players: team.players,
        rule: scenario.rule,
        isBroadcastTable: tableMap.get(scenario.scenarioNumber) === team.teamName,
      }))
    );

  const orderedScenarioList: ScenarioInfo[] = [
    ...scenarioList.filter((s) => s.section === '前半'),
    ...kyukeiScenarios,
    ...scenarioList.filter((s) => s.section === '後半'),
  ];

  const broadcastSchedule = [...zenhanRows, ...kyukeiRows, ...kohanRows];
  const warnings = checkIntegrity(scenarioList, tableMap, zenhanRows, kohanTeams);

  return { broadcastSchedule, scenarioList: orderedScenarioList, warnings };
}
