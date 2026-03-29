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
}

export interface AggregationRow {
  teamName: string;
  scenarioNumber: number;
  goldenEgg: number;
  redEgg: number;
}

export function loadCsvData(bundlePath: string): CsvData {
  const dataDir = join(bundlePath, 'sample-data', 'data');

  // 配信卓.csv
  const broadcastRaw = parseCSV(readFileSync(join(dataDir, '配信卓.csv'), 'utf8'));
  const broadcastSchedule: BroadcastRow[] = broadcastRaw
    .slice(1) // skip header
    .filter((row) => row.length >= 7)
    .map((row) => ({
      scenarioNumber: row[0].trim() === '' ? null : Number(row[0].trim()),
      teamName: row[1].trim(),
      players: [row[2].trim(), row[3].trim(), row[4].trim(), row[5].trim()] as [string, string, string, string],
      rule: row[6].trim(),
    }));

  // scenario.csv
  const scenarioRaw = parseCSV(readFileSync(join(dataDir, 'scenario.csv'), 'utf8'));
  const scenarioList: ScenarioInfo[] = scenarioRaw
    .slice(1)
    .filter((row) => row.length >= 7)
    .map((row) => ({
      scenarioNumber: Number(row[0].trim()),
      displayName: row[2].trim(), // シナリオ名_表示用
      rule: row[3].trim(),
      section: row[6].trim(), // 部
    }));

  // 集計.csv
  // header: Discord 登録日時, Discord 登録者名(ID), カテゴリID, 順位, チーム名, シナリオ, 合計金イクラ納品数, 合計赤イクラ取得数, ...
  const aggregationRaw = parseCSV(readFileSync(join(dataDir, '集計.csv'), 'utf8'));
  const aggregation: AggregationRow[] = aggregationRaw
    .slice(1)
    .filter((row) => row.length >= 8 && row[4].trim() !== '' && row[5].trim() !== '')
    .map((row) => ({
      teamName: row[4].trim(),
      scenarioNumber: Number(row[5].trim()),
      goldenEgg: Number(row[6].trim()) || 0,
      redEgg: Number(row[7].trim()) || 0,
    }));

  return { broadcastSchedule, scenarioList, aggregation };
}
