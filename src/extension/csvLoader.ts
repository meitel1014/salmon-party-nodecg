import { readFileSync } from 'fs';
import { join } from 'path';
import type { BroadcastRow, ScenarioInfo } from '../schemas';

function parseCSV(content: string): string[][] {
  return content
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => line.split(','));
}

export interface CsvData {
  broadcastSchedule: BroadcastRow[];
  scenarioList: ScenarioInfo[];
  aggregation: AggregationRow[];
  broadcastDisplayNames: Record<number, string>;
}

export interface AggregationRow {
  teamName: string;
  scenarioNumber: number;
  goldenEgg: number;
  redEgg: number;
}

export function loadCsvData(bundlePath: string): CsvData {
  const dataDir = join(bundlePath, 'data');
  const sampleDataDir = join(bundlePath, 'sample-data', 'data');

  // ルール.csv: シナリオ番号 → ルール名
  const ruleRaw = parseCSV(readFileSync(join(dataDir, 'ルール.csv'), 'utf8'));
  const ruleMap = new Map<number, string>();
  for (const row of ruleRaw.slice(1)) {
    if (row.length < 2) continue;
    ruleMap.set(Number(row[0].trim()), row[1].trim());
  }

  // scenario.csv（シナリオ番号・表示名・セクション取得。ルールは ルール.csv を使用）
  const scenarioRaw = parseCSV(readFileSync(join(sampleDataDir, 'scenario.csv'), 'utf8'));
  const scenarioList: ScenarioInfo[] = scenarioRaw
    .slice(1)
    .filter((row) => row.length >= 7)
    .map((row) => {
      const scenarioNumber = Number(row[0].trim());
      return {
        scenarioNumber,
        displayName: row[2].trim(),
        rule: ruleMap.get(scenarioNumber) ?? row[3].trim(),
        section: row[6].trim(),
      };
    });

  // 配信卓.csv: シナリオ番号, チーム名, シナリオ表示名(省略可)
  const broadcastTableRaw = parseCSV(readFileSync(join(dataDir, '配信卓.csv'), 'utf8'));
  const broadcastTableMap = new Map<number, string>();
  const broadcastDisplayNames: Record<number, string> = {};
  for (const row of broadcastTableRaw.slice(1)) {
    if (row.length < 2) continue;
    const scenarioNum = Number(row[0].trim());
    broadcastTableMap.set(scenarioNum, row[1].trim());
    const displayName = row[2]?.trim();
    if (displayName) broadcastDisplayNames[scenarioNum] = displayName;
  }

  // 前半チーム情報.csv: シナリオ番号, チーム名, プレイヤー1-4 (シナリオ1-4)
  const zenhanRaw = parseCSV(readFileSync(join(dataDir, '前半チーム情報.csv'), 'utf8'));
  const zenhanRows: BroadcastRow[] = zenhanRaw
    .slice(1)
    .filter((row) => row.length >= 6)
    .map((row) => {
      const scenarioNumber = Number(row[0].trim());
      const teamName = row[1].trim();
      const players = [
        row[2].trim(), row[3].trim(), row[4].trim(), row[5].trim(),
      ] as [string, string, string, string];
      const rule = scenarioList.find((s) => s.scenarioNumber === scenarioNumber)?.rule ?? '';
      const isBroadcastTable = broadcastTableMap.get(scenarioNumber) === teamName;
      const displayTeamName = broadcastDisplayNames[scenarioNumber] ?? teamName;
      return { scenarioNumber, teamName, displayTeamName, players, rule, isBroadcastTable };
    });

  // 後半チーム情報.csv: チーム名, プレイヤー1-4 (シナリオをまたいで固定メンバー)
  const kohanRaw = parseCSV(readFileSync(join(dataDir, '後半チーム情報.csv'), 'utf8'));
  const kohanTeams = kohanRaw
    .slice(1)
    .filter((row) => row.length >= 5)
    .map((row) => ({
      teamName: row[0].trim(),
      players: [
        row[1].trim(), row[2].trim(), row[3].trim(), row[4].trim(),
      ] as [string, string, string, string],
    }));

  // 休憩企画.csv: チーム名, ルール, プレイヤー1-4
  // 1行につき1シナリオ扱い。シナリオ番号は 101 から採番。
  const kyukeiRaw = parseCSV(readFileSync(join(dataDir, '休憩企画.csv'), 'utf8'));
  const kyukeiRows = kyukeiRaw
    .slice(1)
    .filter((row) => row.length >= 6)
    .map((row, i) => ({
      scenarioNumber: 101 + i,
      teamName: row[0].trim(),
      rule: row[1].trim(),
      players: [row[2].trim(), row[3].trim(), row[4].trim(), row[5].trim()] as [string, string, string, string],
    }));

  const kyukeiScenarioEntries: ScenarioInfo[] = kyukeiRows.map((r) => ({
    scenarioNumber: r.scenarioNumber,
    displayName: r.teamName,
    rule: r.rule,
    section: '休憩企画',
  }));

  const kyukeiScheduleRows: BroadcastRow[] = kyukeiRows.map((r) => ({
    scenarioNumber: r.scenarioNumber,
    teamName: r.teamName,
    displayTeamName: r.teamName,
    players: r.players,
    rule: r.rule,
    isBroadcastTable: true,
  }));

  // 後半シナリオ (section === '後半') × 後半チーム → broadcastSchedule エントリ
  const kohanScenarios = scenarioList.filter((s) => s.section === '後半');
  const kohanRows: BroadcastRow[] = kohanScenarios.flatMap((scenario) =>
    kohanTeams.map((team) => ({
      scenarioNumber: scenario.scenarioNumber,
      teamName: team.teamName,
      displayTeamName: broadcastDisplayNames[scenario.scenarioNumber] ?? team.teamName,
      players: team.players,
      rule: scenario.rule,
      isBroadcastTable: broadcastTableMap.get(scenario.scenarioNumber) === team.teamName,
    }))
  );

  // シナリオ順: 前半 → 休憩企画 → 後半
  const zenhanScenarios = scenarioList.filter((s) => s.section === '前半');
  const kohanScenarioInfos = scenarioList.filter((s) => s.section === '後半');
  const orderedScenarioList: ScenarioInfo[] = [
    ...zenhanScenarios,
    ...kyukeiScenarioEntries,
    ...kohanScenarioInfos,
  ];

  const broadcastSchedule = [...zenhanRows, ...kyukeiScheduleRows, ...kohanRows];

  // 集計.csv
  const aggregationRaw = parseCSV(readFileSync(join(sampleDataDir, '集計.csv'), 'utf8'));
  const aggregation: AggregationRow[] = aggregationRaw
    .slice(1)
    .filter((row) => row.length >= 8 && row[4].trim() !== '' && row[5].trim() !== '')
    .map((row) => ({
      teamName: row[4].trim(),
      scenarioNumber: Number(row[5].trim()),
      goldenEgg: Number(row[6].trim()) || 0,
      redEgg: Number(row[7].trim()) || 0,
    }));

  return { broadcastSchedule, scenarioList: orderedScenarioList, aggregation, broadcastDisplayNames };
}
