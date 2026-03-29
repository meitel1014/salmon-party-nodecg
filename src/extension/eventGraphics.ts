import { resolve } from 'path';
import type { NodeCG } from './nodecg';
import { loadCsvData, type CsvData } from './csvLoader';
import type { ResultScreen } from '../schemas';
import { sortByRanking } from '../ranking';
import { usesRedEgg } from '../rules';

function calcRankings(
  aggregation: CsvData['aggregation'],
  scenarioNumber: number,
  rule: string
): ResultScreen['rankings'] {
  const rows = aggregation.filter((r) => r.scenarioNumber === scenarioNumber);
  const redEgg = usesRedEgg(rule);
  return sortByRanking(rows, rule).slice(0, 3).map((row, i) => ({
    rank: i + 1,
    teamName: row.teamName,
    score: redEgg ? row.redEgg : row.goldenEgg,
  }));
}

export function eventGraphics(nodecg: NodeCG) {
  const log = new nodecg.Logger('eventGraphics');

  const playerScreenRep = nodecg.Replicant('playerScreen');
  const resultScreenRep = nodecg.Replicant('resultScreen');
  const broadcastScheduleRep = nodecg.Replicant('broadcastSchedule');
  const scenarioListRep = nodecg.Replicant('scenarioList');
  const aggregationDataRep = nodecg.Replicant('aggregationData');
  nodecg.Replicant('selectedPlayerRowIndex', { defaultValue: null });

  // __dirname = bundle/extension/ → 1つ上がバンドルルート
  const bundlePath = resolve(__dirname, '..');

  let csvData: CsvData | undefined;

  function loadAndSync() {
    csvData = loadCsvData(bundlePath);
    broadcastScheduleRep.value = csvData.broadcastSchedule;
    scenarioListRep.value = csvData.scenarioList;
    aggregationDataRep.value = csvData.aggregation;
    log.info(
      `CSV loaded: ${csvData.broadcastSchedule.length} broadcast rows, ` +
      `${csvData.scenarioList.length} scenarios, ` +
      `${csvData.aggregation.length} aggregation rows`
    );
    for (const w of csvData.warnings) {
      log.warn(w);
    }
  }

  try {
    loadAndSync();
  } catch (err) {
    log.error('Failed to load CSV on startup:', err);
  }

  nodecg.listenFor('setResultScreen', (payload, ack) => {
    if (!csvData) {
      if (ack && !ack.handled) ack(null, { success: false, error: 'CSV not loaded' });
      return;
    }
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

  nodecg.listenFor('setPlayerScreenDirect', (payload, ack) => {
    playerScreenRep.value = {
      teamName: payload.teamName,
      players: payload.players,
      rule: payload.rule,
    };
    log.info(`Player screen set directly: ${payload.teamName}`);
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
