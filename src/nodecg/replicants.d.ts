import type {
  PlayerScreen,
  ResultScreen,
  BroadcastSchedule,
  ScenarioList,
  AggregationData,
  DataSourceConfig,
  AggregationStatus,
} from '../schemas';

/**
 * すべてのReplicantの型を定義するマップ
 */
export type ReplicantMap = {
  playerScreen: PlayerScreen;
  resultScreen: ResultScreen;
  broadcastSchedule: BroadcastSchedule;
  scenarioList: ScenarioList;
  aggregationData: AggregationData;
  dataSourceConfig: DataSourceConfig;
  aggregationStatus: AggregationStatus;
  selectedPlayerRowIndex: number | null;
  /** 結果発表パネルで選択中のシナリオ番号。null なら先頭シナリオとして扱う */
  selectedResultScenarioNumber: number | null;
};
