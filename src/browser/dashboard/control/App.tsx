import { useState } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  const [scenarioList] = useReplicant('scenarioList');

  const [playerRowIndex, setPlayerRowIndex] = useState(0);
  const [resultScenarioNumber, setResultScenarioNumber] = useState<number>(1);
  const [playerStatus, setPlayerStatus] = useState('');
  const [resultStatus, setResultStatus] = useState('');

  const handleApplyPlayer = async () => {
    try {
      setPlayerStatus('適用中...');
      await nodecg.sendMessage('setPlayerScreen', { rowIndex: playerRowIndex });
      const row = broadcastSchedule?.[playerRowIndex];
      setPlayerStatus(row ? `✓ ${row.teamName}` : '✓ 適用しました');
    } catch (err) {
      setPlayerStatus(`エラー: ${(err as Error).message}`);
    }
  };

  const handleApplyResult = async () => {
    try {
      setResultStatus('適用中...');
      await nodecg.sendMessage('setResultScreen', { scenarioNumber: resultScenarioNumber });
      const scenario = scenarioList?.find((s) => s.scenarioNumber === resultScenarioNumber);
      setResultStatus(scenario ? `✓ ${scenario.displayName}` : '✓ 適用しました');
    } catch (err) {
      setResultStatus(`エラー: ${(err as Error).message}`);
    }
  };

  const handleReload = async () => {
    try {
      await nodecg.sendMessage('reloadCsvData');
      setPlayerStatus('');
      setResultStatus('');
    } catch (err) {
      console.error('Reload failed:', err);
    }
  };

  return (
    <div className="container">
      {/* プレイヤー画面 */}
      <div className="section">
        <span className="section-title">プレイヤー画面</span>
        <div className="row">
          <select
            className="select"
            value={playerRowIndex}
            onChange={(e) => setPlayerRowIndex(Number(e.target.value))}
          >
            {broadcastSchedule?.map((row, i) => (
              <option key={i} value={i}>
                {row.teamName} ({row.rule})
              </option>
            )) ?? <option>読み込み中...</option>}
          </select>
          <button className="apply-button" onClick={handleApplyPlayer}>
            適用
          </button>
        </div>
        <span className="status">{playerStatus}</span>
      </div>

      <hr className="divider" />

      {/* 結果発表 */}
      <div className="section">
        <span className="section-title">結果発表</span>
        <div className="row">
          <select
            className="select"
            value={resultScenarioNumber}
            onChange={(e) => setResultScenarioNumber(Number(e.target.value))}
          >
            {scenarioList?.map((s) => (
              <option key={s.scenarioNumber} value={s.scenarioNumber}>
                {s.displayName} ({s.rule})
              </option>
            )) ?? <option>読み込み中...</option>}
          </select>
          <button className="apply-button" onClick={handleApplyResult}>
            適用
          </button>
        </div>
        <span className="status">{resultStatus}</span>
      </div>

      <hr className="divider" />

      <button className="reload-button" onClick={handleReload}>
        CSV リロード
      </button>
    </div>
  );
}
