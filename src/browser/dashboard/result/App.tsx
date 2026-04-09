import { useState, useEffect, useMemo, useRef } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { sortByRanking } from '../../../ranking';
import { ScenarioNav } from '../components/ScenarioNav';
import './style.css';

export function App() {
  const [scenarioList] = useReplicant('scenarioList');
  const [aggregationData] = useReplicant('aggregationData');
  const [broadcastSchedule] = useReplicant('broadcastSchedule');

  const [scenarioNumber, setScenarioNumber] = useState<number | null>(null);
  const [applyState, setApplyState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // scenarioList がロードされたら最初のシナリオを選択
  useEffect(() => {
    if (!scenarioList || scenarioList.length === 0) return;
    if (scenarioNumber !== null) return;
    setScenarioNumber(scenarioList[0].scenarioNumber);
  }, [scenarioList, scenarioNumber]);

  const currentScenario = scenarioList?.find((s) => s.scenarioNumber === scenarioNumber);

  const allRankings = useMemo(() => {
    if (!aggregationData || scenarioNumber === null || !currentScenario) return [];
    const rows = aggregationData.filter((r) => r.scenarioNumber === scenarioNumber);
    return sortByRanking(rows, currentScenario.rule).map((r) => {
      const bRow = broadcastSchedule?.find(
        (b) => b.scenarioNumber === scenarioNumber && b.teamName === r.teamName
      );
      return { ...r, members: bRow?.players ?? ['', '', '', ''] };
    });
  }, [aggregationData, broadcastSchedule, scenarioNumber, currentScenario]);

  const handleApplyResult = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (scenarioNumber === null) return;

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    try {
      setApplyState('pending');
      await nodecg.sendMessage('setResultScreen', { scenarioNumber });
      setApplyState('success');
    } catch {
      setApplyState('error');
    }
    resetTimerRef.current = setTimeout(() => setApplyState('idle'), 1500);
  };

  return (
    <div className="container">
      <div className="section">
        <ScenarioNav
          scenarioList={scenarioList}
          currentScenarioNumber={scenarioNumber}
          onScenarioChange={setScenarioNumber}
        >
          <button
            className={`apply-button apply-button--${applyState}`}
            onClick={handleApplyResult}
            disabled={scenarioNumber === null || applyState === 'pending'}
          >
            適用
          </button>
        </ScenarioNav>

        {allRankings.length > 0 ? (
          <table className="rankings-table">
            <thead>
              <tr>
                <th>順位</th>
                <th>チーム名</th>
                <th className="egg-col">金イクラ</th>
                <th className="egg-col">赤イクラ</th>
                <th>メンバー1</th>
                <th>メンバー2</th>
                <th>メンバー3</th>
                <th>メンバー4</th>
              </tr>
            </thead>
            <tbody>
              {allRankings.map((r, idx) => (
                <tr key={r.teamName}>
                  <td>{idx + 1}</td>
                  <td>{r.teamName}</td>
                  <td className="egg-col">{r.goldenEgg}</td>
                  <td className="egg-col">{r.redEgg}</td>
                  <td>{r.members[0]}</td>
                  <td>{r.members[1]}</td>
                  <td>{r.members[2]}</td>
                  <td>{r.members[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span className="no-data">集計データなし</span>
        )}
      </div>
    </div>
  );
}
