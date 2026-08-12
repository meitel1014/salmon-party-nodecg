import { resolve } from 'path';
import type { NodeCG } from './nodecg';
import { loadCsvData, type CsvData } from './csvLoader';
import { loadAggregation } from './aggregationLoader';
import {
  DATA_SOURCE_LABELS,
  DEFAULT_AGGREGATION_STATUS,
  DEFAULT_DATA_SOURCE_CONFIG,
} from '../dataSource';
import type {
  AggregationRow,
  AggregationStatus,
  BroadcastRow,
  DataSourceConfig,
  ResultScreen,
} from '../schemas';
import { sortByRanking } from '../ranking';
import { usesRedEgg } from '../rules';
import { buildTeamRowIndex, normalizeTeamName } from '../teamName';

function calcRankings(
  aggregation: AggregationRow[],
  broadcastSchedule: BroadcastRow[],
  scenarioNumber: number,
  rule: string
): ResultScreen['rankings'] {
  const rows = aggregation.filter((r) => r.scenarioNumber === scenarioNumber);
  const redEgg = usesRedEgg(rule);
  const teamRows = buildTeamRowIndex(broadcastSchedule, scenarioNumber);
  return sortByRanking(rows, rule).slice(0, 3).map((row, i) => {
    const bRow = teamRows.get(normalizeTeamName(row.teamName));
    return {
      rank: i + 1,
      teamName: row.teamName,
      members: bRow?.players ?? ['', '', '', ''],
      score: redEgg ? row.redEgg : row.goldenEgg,
    };
  });
}

/** 集計データにあるが broadcastSchedule に該当が無いチーム名を洗い出す（メンバー欄が空になる） */
function findUnmatchedTeams(
  aggregation: AggregationRow[],
  broadcastSchedule: BroadcastRow[]
): string[] {
  const indexByScenario = new Map<number, Map<string, BroadcastRow>>();
  const unmatched = new Set<string>();
  for (const row of aggregation) {
    let index = indexByScenario.get(row.scenarioNumber);
    if (!index) {
      index = buildTeamRowIndex(broadcastSchedule, row.scenarioNumber);
      indexByScenario.set(row.scenarioNumber, index);
    }
    if (!index.has(normalizeTeamName(row.teamName))) {
      unmatched.add(`シナリオ${row.scenarioNumber}「${row.teamName}」`);
    }
  }
  return [...unmatched];
}

export function eventGraphics(nodecg: NodeCG) {
  const log = new nodecg.Logger('eventGraphics');

  const playerScreenRep = nodecg.Replicant('playerScreen');
  const resultScreenRep = nodecg.Replicant('resultScreen');
  const broadcastScheduleRep = nodecg.Replicant('broadcastSchedule');
  const scenarioListRep = nodecg.Replicant('scenarioList');
  const aggregationDataRep = nodecg.Replicant('aggregationData');
  const dataSourceConfigRep = nodecg.Replicant('dataSourceConfig');
  const aggregationStatusRep = nodecg.Replicant('aggregationStatus');
  nodecg.Replicant('selectedPlayerRowIndex', { defaultValue: null });
  const selectedResultScenarioRep = nodecg.Replicant('selectedResultScenarioNumber', {
    defaultValue: null,
  });

  // __dirname = bundle/extension/ → 1つ上がバンドルルート
  const bundlePath = resolve(__dirname, '..');

  let csvData: CsvData | undefined;
  // 集計データは「未ロード」を undefined で表す。空配列は「0件をロード済み」であり別物。
  let aggregation: AggregationRow[] | undefined;
  // 起動時ロードが遅れている最中に手動リロードされた場合の逆順上書きを防ぐ
  let loadGeneration = 0;

  function loadCsvAndSync() {
    csvData = loadCsvData(bundlePath);
    broadcastScheduleRep.value = structuredClone(csvData.broadcastSchedule);
    scenarioListRep.value = structuredClone(csvData.scenarioList);
    log.info(
      `CSV loaded: ${csvData.broadcastSchedule.length} broadcast rows, ` +
      `${csvData.scenarioList.length} scenarios`
    );
    for (const w of csvData.warnings) {
      log.warn(w);
    }
    // シナリオ一覧やメンバーが変わった可能性があるので結果画面も作り直す
    syncResultScreen();
  }

  // Replicant の .value は NodeCG が変更検知用に Proxy で包んでいる。
  // structuredClone は Proxy を複製できず DataCloneError になるため、
  // 読み出すときはフィールドを明示的に写してプレーンな値にする。
  function readDataSourceConfig(): DataSourceConfig {
    const v = dataSourceConfigRep.value;
    if (!v) return { ...DEFAULT_DATA_SOURCE_CONFIG };
    return { type: v.type, url: v.url, sheetTitle: v.sheetTitle };
  }

  function readAggregationStatus(): AggregationStatus {
    const v = aggregationStatusRep.value;
    if (!v) return { ...DEFAULT_AGGREGATION_STATUS, warnings: [] };
    return {
      state: v.state,
      sourceType: v.sourceType,
      rowCount: v.rowCount,
      skippedCount: v.skippedCount,
      loadedAt: v.loadedAt,
      error: v.error,
      warnings: [...v.warnings],
      resolvedColumns: v.resolvedColumns,
    };
  }

  /** 現在のデータソース設定で集計データを再取得する。失敗時は既存の集計データを維持する。 */
  async function loadAggregationAndSync(): Promise<{ success: boolean; error?: string }> {
    const generation = ++loadGeneration;
    const config = readDataSourceConfig();
    const label = DATA_SOURCE_LABELS[config.type];

    aggregationStatusRep.value = {
      ...readAggregationStatus(),
      state: 'loading',
      sourceType: config.type,
      error: '',
    };

    const result = await loadAggregation(config, bundlePath);

    // 後発のロードが既に走っている場合、古い結果で上書きしない
    if (generation !== loadGeneration) {
      log.info(`Aggregation load #${generation} superseded by a newer load`);
      return { success: result.ok, error: result.ok ? undefined : result.error };
    }

    if (!result.ok) {
      log.error(`Failed to load aggregation from ${label}: ${result.error}`);
      aggregationStatusRep.value = {
        ...readAggregationStatus(),
        state: 'error',
        sourceType: config.type,
        error: result.error,
      };
      return { success: false, error: result.error };
    }

    const { rows, skipped, resolvedColumns, warnings } = result.data;
    aggregation = rows;
    aggregationDataRep.value = structuredClone(rows);
    // 取り込んだ内容をそのまま結果画面へ反映する（選択シナリオは変えない）
    syncResultScreen();

    const unmatched = csvData ? findUnmatchedTeams(rows, csvData.broadcastSchedule) : [];
    const allWarnings = [
      ...warnings,
      ...(unmatched.length > 0
        ? [`チーム情報CSVに該当が無く、メンバー欄が空になります: ${unmatched.join('、')}`]
        : []),
    ];

    aggregationStatusRep.value = {
      state: 'loaded',
      sourceType: config.type,
      rowCount: rows.length,
      skippedCount: skipped,
      loadedAt: new Date().toISOString(),
      error: '',
      warnings: allWarnings,
      resolvedColumns,
    };

    log.info(
      `Aggregation loaded from ${label}: ${rows.length} rows` +
      (skipped > 0 ? `, ${skipped} skipped` : '') +
      ` (${resolvedColumns})`
    );
    for (const w of allWarnings) {
      log.warn(w);
    }
    return { success: true };
  }

  /**
   * 「選択中のシナリオ × その時点でロード済みの集計データ」から結果画面を作り直す。
   *
   * 適用ボタンは無く、選択変更・集計データ再取得・CSV 再読込のたびにここを通す。
   * CSV や集計データが未ロードのうちは **resultScreen に代入しない**（配信中の表示を
   * 空のランキングで壊さないため）。ロード完了時に改めて呼ばれるので取りこぼしはない。
   */
  function syncResultScreen() {
    if (!csvData || !aggregation) return;

    // 未選択（起動直後など）は先頭シナリオとして扱う。パネル側の既定値と揃えること。
    const scenarioNumber =
      selectedResultScenarioRep.value ?? csvData.scenarioList[0]?.scenarioNumber;
    if (scenarioNumber === undefined) return;

    const scenario = csvData.scenarioList.find((s) => s.scenarioNumber === scenarioNumber);
    if (!scenario) {
      log.warn(`Scenario ${scenarioNumber} not found; result screen left unchanged`);
      return;
    }

    const rankings = calcRankings(
      aggregation,
      csvData.broadcastSchedule,
      scenarioNumber,
      scenario.rule
    );
    try {
      resultScreenRep.value = structuredClone({
        scenarioDisplayName: scenario.displayName,
        rule: scenario.rule,
        rankings,
      });
    } catch (err) {
      log.error('Failed to set resultScreen:', err);
      log.error('rankings payload:', JSON.stringify(rankings));
      return;
    }
    log.info(
      `Result screen synced: ${scenario.displayName} (${scenario.rule}), ` +
      `${rankings.length} teams ranked`
    );
  }

  // 宣言直後に現在値で1回発火する。その時点では未ロードなので早期 return される。
  selectedResultScenarioRep.on('change', () => {
    syncResultScreen();
  });

  try {
    loadCsvAndSync();
  } catch (err) {
    log.error('Failed to load CSV on startup:', err);
  }

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
      loadCsvAndSync();
    } catch (err) {
      log.error('Failed to reload CSV:', err);
      if (ack && !ack.handled) ack(null, { success: false, error: (err as Error).message });
      return;
    }
    void loadAggregationAndSync().then((result) => {
      if (ack && !ack.handled) ack(null, result);
    });
  });

  nodecg.listenFor('setDataSourceConfig', (payload, ack) => {
    // 設定の保存とロードを Extension 側で一貫して行う。パネルが Replicant を直接書いてから
    // リロードを送る構成にすると、socket 上の順序が保証されず競合する。
    dataSourceConfigRep.value = {
      type: payload.type,
      url: payload.url,
      sheetTitle: payload.sheetTitle,
    };
    log.info(`Data source set to: ${DATA_SOURCE_LABELS[payload.type]}`);
    void loadAggregationAndSync().then((result) => {
      if (ack && !ack.handled) ack(null, result);
    });
  });

  nodecg.listenFor('reloadAggregation', (_, ack) => {
    void loadAggregationAndSync().then((result) => {
      if (ack && !ack.handled) ack(null, result);
    });
  });

  // listenFor の登録をすべて済ませてから開始する。await を挟むと起動直後のメッセージを取りこぼす。
  void loadAggregationAndSync();
}
