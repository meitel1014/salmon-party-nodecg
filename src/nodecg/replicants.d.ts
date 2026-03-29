import type {
  PlayerScreen,
  ResultScreen,
  BroadcastSchedule,
  ScenarioList,
  AggregationData,
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
};
