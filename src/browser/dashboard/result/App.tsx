import { useState, useRef, useEffect, useMemo } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [scenarioList] = useReplicant('scenarioList');
  const [aggregationData] = useReplicant('aggregationData');

  const [resultScenarioNumber, setResultScenarioNumber] = useState<number>(1);
  const [resultStatus, setResultStatus] = useState('');
  const resultInitRef = useRef(false);

  useEffect(() => {
    if (!scenarioList || resultInitRef.current) return;
    resultInitRef.current = true;
    const first = scenarioList[0]?.scenarioNumber;
    if (first !== undefined) setResultScenarioNumber(first);
  }, [scenarioList]);

  const resultScenario = scenarioList?.find((s) => s.scenarioNumber === resultScenarioNumber);
  const useRedEgg = resultScenario?.rule === 'ローポイント' || resultScenario?.rule === '赤乱獲';
  const isAscending = resultScenario?.rule === 'ローポイント';
  const scoreLabel = useRedEgg ? '赤イクラ' : '金イクラ';

  const allRankings = useMemo(() => {
    if (!aggregationData) return [];
    return [...aggregationData]
      .filter((r) => r.scenarioNumber === resultScenarioNumber)
      .sort((a, b) => {
        const as = useRedEgg ? a.redEgg : a.goldenEgg;
        const bs = useRedEgg ? b.redEgg : b.goldenEgg;
        return isAscending ? as - bs : bs - as;
      });
  }, [aggregationData, resultScenarioNumber, useRedEgg, isAscending]);

  const handleApplyResult = async () => {
    try {
      setResultStatus('適用中...');
      await nodecg.sendMessage('setResultScreen', { scenarioNumber: resultScenarioNumber });
      setResultStatus(resultScenario ? `✓ ${resultScenario.displayName}` : '✓ 適用しました');
    } catch (err) {
      setResultStatus(`エラー: ${(err as Error).message}`);
    }
  };

  return (
    <div className="container">
      <div className="section">
        <div className="row">
          <select
            className="select"
            value={resultScenarioNumber}
            onChange={(e) => setResultScenarioNumber(Number(e.target.value))}
          >
            {scenarioList?.map((s) => (
              <option key={s.scenarioNumber} value={s.scenarioNumber}>
                {s.displayName}（{s.rule}）
              </option>
            )) ?? <option>読み込み中...</option>}
          </select>
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
                <th>{scoreLabel}</th>
              </tr>
            </thead>
            <tbody>
              {allRankings.map((r, idx) => (
                <tr key={r.teamName}>
                  <td>{idx + 1}</td>
                  <td>{r.teamName}</td>
                  <td>{(useRedEgg ? r.redEgg : r.goldenEgg).toLocaleString()}</td>
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
