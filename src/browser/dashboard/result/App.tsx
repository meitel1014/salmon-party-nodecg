import { useState, useMemo, useRef } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import { sortByRanking } from '../../../ranking';
import { buildTeamRowIndex, normalizeTeamName } from '../../../teamName';
import { ScenarioNav } from '../components/ScenarioNav';
import './style.css';

export function App() {
  const [scenarioList] = useReplicant('scenarioList');
  const [aggregationData] = useReplicant('aggregationData');
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  // 選択したシナリオがそのまま Graphic の表示内容になる（適用ボタンは無い）。
  // ローカルステートではなく Replicant に持たせることで、Extension が結果画面を
  // 作り直せるようになり、複数の PC からパネルを開いても同じ状態が見える。
  const [selectedScenarioNumber, setSelectedScenarioNumber] =
    useReplicant('selectedResultScenarioNumber');

  const [reloadState, setReloadState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [reloadError, setReloadError] = useState('');
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 未選択なら先頭シナリオ。Extension 側の syncResultScreen と同じ既定にすること
  const scenarioNumber = selectedScenarioNumber ?? scenarioList?.[0]?.scenarioNumber ?? null;

  const currentScenario = scenarioList?.find((s) => s.scenarioNumber === scenarioNumber);

  const allRankings = useMemo(() => {
    if (!aggregationData || scenarioNumber === null || !currentScenario) return [];
    const rows = aggregationData.filter((r) => r.scenarioNumber === scenarioNumber);
    const teamRows = buildTeamRowIndex(broadcastSchedule ?? [], scenarioNumber);
    return sortByRanking(rows, currentScenario.rule).map((r) => {
      const bRow = teamRows.get(normalizeTeamName(r.teamName));
      return { ...r, members: bRow?.players ?? ['', '', '', ''] };
    });
  }, [aggregationData, broadcastSchedule, scenarioNumber, currentScenario]);

  /**
   * 現在のデータソース（スプレッドシート or 集計.csv）から集計データを取り直す。
   * 成功すると下の表と Graphic の両方が、選択中シナリオの最新順位に更新される。
   */
  const handleReload = async () => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    setReloadState('pending');
    setReloadError('');
    try {
      const result = await nodecg.sendMessage('reloadAggregation');
      setReloadState(result.success ? 'success' : 'error');
      setReloadError(result.success ? '' : (result.error ?? '読み込みに失敗しました'));
    } catch (err) {
      setReloadState('error');
      setReloadError((err as Error).message || '読み込みに失敗しました');
    }
    reloadTimerRef.current = setTimeout(() => setReloadState('idle'), 1500);
  };

  return (
    <div className="container">
      <div className="section">
        <ScenarioNav
          scenarioList={scenarioList}
          currentScenarioNumber={scenarioNumber}
          onScenarioChange={setSelectedScenarioNumber}
        >
          <button
            className={`reload-button reload-button--${reloadState}`}
            onClick={handleReload}
            disabled={reloadState === 'pending'}
            title="集計データを取り直して、下の表と Graphic を最新にします"
          >
            {reloadState === 'pending' ? '更新中...' : '更新'}
          </button>
        </ScenarioNav>

        {!!reloadError && <span className="reload-error">更新に失敗: {reloadError}</span>}

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
