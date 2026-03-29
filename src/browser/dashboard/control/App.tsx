import { useState, useRef, useEffect, useMemo } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  const [scenarioList] = useReplicant('scenarioList');

  const [playerScenarioIdx, setPlayerScenarioIdx] = useState(0);
  const [playerRowIndex, setPlayerRowIndex] = useState(-1);
  const [playerStatus, setPlayerStatus] = useState('');

  const prevPlayerScenarioIdxRef = useRef<number | null>(null);

  // シナリオが変わったときチームを自動選択
  useEffect(() => {
    if (!scenarioList || !broadcastSchedule) return;
    if (prevPlayerScenarioIdxRef.current === playerScenarioIdx) return;
    prevPlayerScenarioIdxRef.current = playerScenarioIdx;

    const scenario = scenarioList[playerScenarioIdx];
    if (!scenario) return;

    const found = broadcastSchedule.findIndex(
      (r) => r.scenarioNumber === scenario.scenarioNumber && r.players.some((p) => p !== '')
    );
    setPlayerRowIndex(found);
  }, [playerScenarioIdx, scenarioList, broadcastSchedule]);

  const currentScenario = scenarioList?.[playerScenarioIdx];
  const scenarioCount = scenarioList?.length ?? 0;

  // プレイヤー情報があるチームのみ選択可能
  const selectableTeams = useMemo(
    () =>
      (broadcastSchedule ?? []).flatMap((row, i) =>
        row.players.some((p) => p !== '') ? [{ i, row }] : []
      ),
    [broadcastSchedule]
  );
  const hasTeamInfo = playerRowIndex !== -1;

  const handleApplyPlayer = async () => {
    if (!hasTeamInfo) return;
    try {
      setPlayerStatus('適用中...');
      await nodecg.sendMessage('setPlayerScreen', { rowIndex: playerRowIndex });
      const row = broadcastSchedule?.[playerRowIndex];
      setPlayerStatus(row ? `✓ ${row.teamName}` : '✓ 適用しました');
    } catch (err) {
      setPlayerStatus(`エラー: ${(err as Error).message}`);
    }
  };

  const handleReload = async () => {
    try {
      await nodecg.sendMessage('reloadCsvData');
      setPlayerStatus('');
    } catch (err) {
      console.error('Reload failed:', err);
    }
  };

  return (
    <div className="container">
      <div className="section">
        <span className="section-title">シナリオ</span>
        <div className="scenario-nav">
          <button
            className="nav-btn"
            onClick={() => setPlayerScenarioIdx((i) => Math.max(0, i - 1))}
            disabled={playerScenarioIdx === 0}
          >
            ←
          </button>
          <span className="scenario-label">
            {currentScenario
              ? `${currentScenario.displayName}（${currentScenario.rule}）`
              : '読み込み中...'}
          </span>
          <button
            className="nav-btn"
            onClick={() => setPlayerScenarioIdx((i) => Math.min(scenarioCount - 1, i + 1))}
            disabled={playerScenarioIdx >= scenarioCount - 1}
          >
            →
          </button>
        </div>

        <span className="section-title">チーム</span>
        {hasTeamInfo ? (
          <div className="row">
            <select
              className="select"
              value={playerRowIndex}
              onChange={(e) => setPlayerRowIndex(Number(e.target.value))}
            >
              {selectableTeams.map(({ i, row }) => (
                <option key={i} value={i}>
                  {row.teamName}
                  {row.scenarioNumber !== null ? ` (S${row.scenarioNumber})` : ''}
                </option>
              ))}
            </select>
            <button className="apply-button" onClick={handleApplyPlayer}>
              適用
            </button>
          </div>
        ) : (
          <div className="row">
            <span className="no-team">チーム情報なし</span>
            <button className="apply-button" disabled>
              適用
            </button>
          </div>
        )}
        <span className="status">{playerStatus}</span>
      </div>

      <hr className="divider" />
      <button className="reload-button" onClick={handleReload}>
        CSV リロード
      </button>
    </div>
  );
}
