import type { DataSourceConfig } from '../schemas';

/**
 * すべてのメッセージの型を定義するマップ
 */
export type MessageMap = {
  // 結果画面は `selectedResultScenarioNumber` Replicant の変更で自動更新されるため
  // 「適用」相当のメッセージは持たない（→ eventGraphics.ts の syncResultScreen）
  reloadCsvData: {
    result: { success: boolean; error?: string };
  };
  /** データソース設定を保存し、そのまま集計データを再取得する（保存とロードの順序を Extension 側で保証する） */
  setDataSourceConfig: {
    data: DataSourceConfig;
    result: { success: boolean; error?: string };
  };
  /** 現在のデータソース設定で集計データのみ再取得する */
  reloadAggregation: {
    result: { success: boolean; error?: string };
  };
  setPlayerScreenDirect: {
    data: { teamName: string; players: [string, string, string, string]; rule: string };
    result: { success: boolean; error?: string };
  };
};
