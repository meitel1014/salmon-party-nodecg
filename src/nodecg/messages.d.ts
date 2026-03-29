/**
 * すべてのメッセージの型を定義するマップ
 */
export type MessageMap = {
  setPlayerScreen: {
    data: { rowIndex: number };
    result: { success: boolean; error?: string };
  };
  setResultScreen: {
    data: { scenarioNumber: number };
    result: { success: boolean; error?: string };
  };
  reloadCsvData: {
    result: { success: boolean; error?: string };
  };
  setPlayerScreenDirect: {
    data: { teamName: string; players: [string, string, string, string]; rule: string };
    result: { success: boolean; error?: string };
  };
};
