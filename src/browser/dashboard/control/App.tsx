import { useState, useRef, useEffect, useMemo } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  const [scenarioList] = useReplicant('scenarioList');
  const [, setSelectedPlayerRowIndex] = useReplicant('selectedPlayerRowIndex');

  const [playerScenarioIdx, setPlayerScenarioIdx] = useState(0);
  const [playerRowIndex, setPlayerRowIndex] = useState(-1);

  const prevPlayerScenarioIdxRef = useRef<number | null>(null);

  // シナリオが変わったときチームを自動選択（Graphicへの適用はチーム情報パネルの「適用」で行う）
  useEffect(() => {
    if (!scenarioList || !broadcastSchedule) return;
    if (prevPlayerScenarioIdxRef.current === playerScenarioIdx) return;
    prevPlayerScenarioIdxRef.current = playerScenarioIdx;

    const scenario = scenarioList[playerScenarioIdx];
    if (!scenario) return;

    const found = (() => {
      const tableIdx = broadcastSchedule.findIndex(
        (r) => r.scenarioNumber === scenario.scenarioNumber && r.isBroadcastTable
      );
      if (tableIdx !== -1) return tableIdx;
      return broadcastSchedule.findIndex(
        (r) => r.scenarioNumber === scenario.scenarioNumber && r.players.some((p) => p !== '')
      );
    })();
    setPlayerRowIndex(found);
    setSelectedPlayerRowIndex(found);
  }, [playerScenarioIdx, scenarioList, broadcastSchedule]);

  const currentScenario = scenarioList?.[playerScenarioIdx];
  const scenarioCount = scenarioList?.length ?? 0;

  // 現在のシナリオのチームのうち、プレイヤー情報があるもののみ選択可能
  const selectableTeams = useMemo(
    () =>
      (broadcastSchedule ?? []).flatMap((row, i) =>
        row.scenarioNumber === currentScenario?.scenarioNumber && row.players.some((p) => p !== '')
          ? [{ i, row }]
          : []
      ),
    [broadcastSchedule, currentScenario]
  );
  const hasTeamInfo = playerRowIndex !== -1;

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
          <select
            className="select"
            value={playerRowIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setPlayerRowIndex(idx);
              setSelectedPlayerRowIndex(idx);
            }}
          >
            {selectableTeams.map(({ i, row }) => (
              <option key={i} value={i}>
                {row.teamName}
              </option>
            ))}
          </select>
        ) : (
          <span className="no-team">チーム情報なし</span>
        )}
      </div>
    </div>
  );
}
