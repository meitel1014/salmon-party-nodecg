import { useState, useEffect, useMemo } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { sortByRanking } from '../../../ranking';
import { ScenarioNav } from '../components/ScenarioNav';
import './style.css';

export function App() {
  const [scenarioList] = useReplicant('scenarioList');
  const [aggregationData] = useReplicant('aggregationData');

  const [scenarioNumber, setScenarioNumber] = useState<number | null>(null);
  const [resultStatus, setResultStatus] = useState('');

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
    return sortByRanking(rows, currentScenario.rule);
  }, [aggregationData, scenarioNumber, currentScenario]);

  const handleApplyResult = async () => {
    if (scenarioNumber === null) return;
    try {
      setResultStatus('適用中...');
      await nodecg.sendMessage('setResultScreen', { scenarioNumber });
      setResultStatus(currentScenario ? `✓ ${currentScenario.displayName}` : '✓ 適用しました');
    } catch (err) {
      setResultStatus(`エラー: ${(err as Error).message}`);
    }
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
            className="apply-button"
            onClick={handleApplyResult}
            disabled={scenarioNumber === null}
          >
            適用
          </button>
        </ScenarioNav>
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
