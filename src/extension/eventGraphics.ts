import { resolve } from 'path';
import type { NodeCG } from './nodecg';
import { loadCsvData, type CsvData } from './csvLoader';
import type { ResultScreen } from '../schemas';

function calcRankings(
  aggregation: CsvData['aggregation'],
  scenarioNumber: number,
  rule: string
): ResultScreen['rankings'] {
  const rows = aggregation.filter((r) => r.scenarioNumber === scenarioNumber);

  const isAscending = rule === 'ローポイント';
  const useRedSalmon = rule === 'ローポイント' || rule === '赤乱獲';

  const sorted = [...rows].sort((a, b) => {
    const aScore = useRedSalmon ? a.redSalmon : a.goldSalmon;
    const bScore = useRedSalmon ? b.redSalmon : b.goldSalmon;
    return isAscending ? aScore - bScore : bScore - aScore;
  });

  return sorted.slice(0, 3).map((row, i) => ({
    rank: i + 1,
    teamName: row.teamName,
    score: useRedSalmon ? row.redSalmon : row.goldSalmon,
  }));
}

export function eventGraphics(nodecg: NodeCG) {
  const log = new nodecg.Logger('eventGraphics');

  const playerScreenRep = nodecg.Replicant('playerScreen');
  const resultScreenRep = nodecg.Replicant('resultScreen');
  const broadcastScheduleRep = nodecg.Replicant('broadcastSchedule');
  const scenarioListRep = nodecg.Replicant('scenarioList');

  // __dirname = bundle/extension/ → 1つ上がバンドルルート
  const bundlePath = resolve(__dirname, '..');

  let csvData: CsvData;

  function loadAndSync() {
    csvData = loadCsvData(bundlePath);
    broadcastScheduleRep.value = csvData.broadcastSchedule;
    scenarioListRep.value = csvData.scenarioList;
    log.info(
      `CSV loaded: ${csvData.broadcastSchedule.length} broadcast rows, ` +
      `${csvData.scenarioList.length} scenarios, ` +
      `${csvData.aggregation.length} aggregation rows`
    );
  }

  loadAndSync();

  nodecg.listenFor('setPlayerScreen', (payload, ack) => {
    const { rowIndex } = payload;
    const row = csvData.broadcastSchedule[rowIndex];
    if (!row) {
      if (ack && !ack.handled) ack(null, { success: false, error: `Row ${rowIndex} not found` });
      return;
    }
    playerScreenRep.value = {
      teamName: row.teamName,
      players: [...row.players] as [string, string, string, string],
      rule: row.rule,
    };
    log.info(`Player screen set to: ${row.teamName}`);
    if (ack && !ack.handled) ack(null, { success: true });
  });

  nodecg.listenFor('setResultScreen', (payload, ack) => {
    const { scenarioNumber } = payload;
    const scenario = csvData.scenarioList.find((s) => s.scenarioNumber === scenarioNumber);
    if (!scenario) {
      if (ack && !ack.handled) ack(null, { success: false, error: `Scenario ${scenarioNumber} not found` });
      return;
    }
    const rankings = calcRankings(csvData.aggregation, scenarioNumber, scenario.rule);
    resultScreenRep.value = {
      scenarioDisplayName: scenario.displayName,
      rule: scenario.rule,
      rankings,
    };
    log.info(`Result screen set to: ${scenario.displayName} (${scenario.rule}), ${rankings.length} teams ranked`);
    if (ack && !ack.handled) ack(null, { success: true });
  });

  nodecg.listenFor('reloadCsvData', (_, ack) => {
    try {
      loadAndSync();
      if (ack && !ack.handled) ack(null, { success: true });
    } catch (err) {
      log.error('Failed to reload CSV:', err);
      if (ack && !ack.handled) ack(null, { success: false, error: (err as Error).message });
    }
  });
}
