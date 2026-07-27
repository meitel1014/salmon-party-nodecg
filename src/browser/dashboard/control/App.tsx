import { useState, useEffect, useMemo } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { ScenarioNav } from '../components/ScenarioNav';
import './style.css';

export function App() {
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  const [scenarioList] = useReplicant('scenarioList');
  const [selectedRowIndex, setSelectedRowIndex] = useReplicant('selectedPlayerRowIndex');

  const [selectedScenarioNumber, setSelectedScenarioNumber] = useState<number | null>(null);

  // 明示選択が無ければ最初のシナリオを既定にする（effect で setState せず render 中に導出）
  const playerScenarioNumber = selectedScenarioNumber ?? scenarioList?.[0]?.scenarioNumber ?? null;

  // シナリオが変わったときチームを自動選択（Graphicへの適用はチーム情報パネルの「適用」で行う）
  useEffect(() => {
    if (!broadcastSchedule || playerScenarioNumber === null) return;

    const tableIdx = broadcastSchedule.findIndex(
      (r) => r.scenarioNumber === playerScenarioNumber && r.isBroadcastTable
    );
    const found = tableIdx !== -1
      ? tableIdx
      : broadcastSchedule.findIndex(
          (r) => r.scenarioNumber === playerScenarioNumber && r.players.some((p) => p !== '')
        );
    setSelectedRowIndex(found === -1 ? null : found);
  }, [playerScenarioNumber, broadcastSchedule, setSelectedRowIndex]);

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
  const hasTeamInfo = selectableTeams.length > 0;

  return (
    <div className="container">
      <div className="section">
        <span className="section-title">シナリオ</span>
        <ScenarioNav
          scenarioList={scenarioList}
          currentScenarioNumber={playerScenarioNumber}
          onScenarioChange={setSelectedScenarioNumber}
        />

        <span className="section-title">チーム</span>
        {hasTeamInfo ? (
          <select
            className="select"
            value={selectedRowIndex ?? ''}
            onChange={(e) => setSelectedRowIndex(Number(e.target.value))}
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
