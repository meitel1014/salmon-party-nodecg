import { useState, useRef, useEffect, useMemo } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [scenarioList] = useReplicant('scenarioList');
  const [aggregationData] = useReplicant('aggregationData');

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [resultStatus, setResultStatus] = useState('');
  const initRef = useRef(false);

  useEffect(() => {
    if (!scenarioList || initRef.current) return;
    initRef.current = true;
    setScenarioIdx(0);
  }, [scenarioList]);

  const scenarioCount = scenarioList?.length ?? 0;
  const currentScenario = scenarioList?.[scenarioIdx];
  const resultScenarioNumber = currentScenario?.scenarioNumber;

  const useRedEgg = currentScenario?.rule === 'ローポイント' || currentScenario?.rule === '赤乱獲';
  const isAscending = currentScenario?.rule === 'ローポイント';

  const allRankings = useMemo(() => {
    if (!aggregationData || resultScenarioNumber === undefined) return [];
    return [...aggregationData]
      .filter((r) => r.scenarioNumber === resultScenarioNumber)
      .sort((a, b) => {
        const aScore = useRedEgg ? a.redEgg : a.goldenEgg;
        const bScore = useRedEgg ? b.redEgg : b.goldenEgg;
        const primary = isAscending ? aScore - bScore : bScore - aScore;
        if (primary !== 0 || useRedEgg) return primary;
        return b.redEgg - a.redEgg;
      });
  }, [aggregationData, resultScenarioNumber, useRedEgg, isAscending]);

  const handleApplyResult = async () => {
    if (resultScenarioNumber === undefined) return;
    try {
      setResultStatus('適用中...');
      await nodecg.sendMessage('setResultScreen', { scenarioNumber: resultScenarioNumber });
      setResultStatus(currentScenario ? `✓ ${currentScenario.displayName}` : '✓ 適用しました');
    } catch (err) {
      setResultStatus(`エラー: ${(err as Error).message}`);
    }
  };

  return (
    <div className="container">
      <div className="section">
        <div className="scenario-nav">
          <button
            className="nav-btn"
            onClick={() => setScenarioIdx((i) => Math.max(0, i - 1))}
            disabled={scenarioIdx === 0}
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
            onClick={() => setScenarioIdx((i) => Math.min(scenarioCount - 1, i + 1))}
            disabled={scenarioIdx >= scenarioCount - 1}
          >
            →
          </button>
          <button className="apply-button" onClick={handleApplyResult}>
            適用
          </button>
        </div>
        <span className="status">{resultStatus}</span>

        {allRankings.length > 0 ? (
          <table className="rankings-table">
            <thead>
              <tr>
                <th>順位</th>
                <th>チーム名</th>
                <th className="egg-col">金イクラ</th>
                <th className="egg-col">赤イクラ</th>
              </tr>
            </thead>
            <tbody>
              {allRankings.map((r, idx) => (
                <tr key={r.teamName}>
                  <td>{idx + 1}</td>
                  <td>{r.teamName}</td>
                  <td className="egg-col">{r.goldenEgg}</td>
                  <td className="egg-col">{r.redEgg}</td>
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
