import { useState, useEffect, useMemo } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  const [scenarioList] = useReplicant('scenarioList');
  const [, setSelectedPlayerRowIndex] = useReplicant('selectedPlayerRowIndex');

  const [playerScenarioNumber, setPlayerScenarioNumber] = useState<number | null>(null);
  const [playerRowIndex, setPlayerRowIndex] = useState(-1);

  // scenarioList がロードされたら最初のシナリオを選択
  useEffect(() => {
    if (!scenarioList || scenarioList.length === 0) return;
    if (playerScenarioNumber !== null) return;
    setPlayerScenarioNumber(scenarioList[0].scenarioNumber);
  }, [scenarioList, playerScenarioNumber]);

  // シナリオが変わったときチームを自動選択（Graphicへの適用はチーム情報パネルの「適用」で行う）
  useEffect(() => {
    if (!broadcastSchedule || playerScenarioNumber === null) return;

    const found = (() => {
      const tableIdx = broadcastSchedule.findIndex(
        (r) => r.scenarioNumber === playerScenarioNumber && r.isBroadcastTable
      );
      if (tableIdx !== -1) return tableIdx;
      return broadcastSchedule.findIndex(
        (r) => r.scenarioNumber === playerScenarioNumber && r.players.some((p) => p !== '')
      );
    })();
    setPlayerRowIndex(found);
    setSelectedPlayerRowIndex(found);
  }, [playerScenarioNumber, broadcastSchedule, setSelectedPlayerRowIndex]);

  const currentScenario = scenarioList?.find((s) => s.scenarioNumber === playerScenarioNumber);
  const scenarioCount = scenarioList?.length ?? 0;
  const currentScenarioIdx = scenarioList?.findIndex((s) => s.scenarioNumber === playerScenarioNumber) ?? -1;

  // 現在のシナリオのチームのうち、プレイヤー情報があるもののみ選択可能
  const selectableTeams = useMemo(
    () =>
      (broadcastSchedule ?? []).flatMap((row, i) =>
        row.scenarioNumber === playerScenarioNumber && row.players.some((p) => p !== '')
          ? [{ i, row }]
          : []
      ),
    [broadcastSchedule, playerScenarioNumber]
  );
  const hasTeamInfo = playerRowIndex !== -1;

  return (
    <div className="container">
      <div className="section">
        <span className="section-title">シナリオ</span>
        <div className="scenario-nav">
          <button
            className="nav-btn"
            onClick={() => {
              if (!scenarioList || currentScenarioIdx <= 0) return;
              setPlayerScenarioNumber(scenarioList[currentScenarioIdx - 1].scenarioNumber);
            }}
            disabled={currentScenarioIdx <= 0}
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
            onClick={() => {
              if (!scenarioList || currentScenarioIdx >= scenarioCount - 1) return;
              setPlayerScenarioNumber(scenarioList[currentScenarioIdx + 1].scenarioNumber);
            }}
            disabled={currentScenarioIdx >= scenarioCount - 1}
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
