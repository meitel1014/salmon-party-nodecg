import { useState, useEffect, useRef } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  const [selectedRowIndex] = useReplicant('selectedPlayerRowIndex');

  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<[string, string, string, string]>(['', '', '', '']);
  const [rule, setRule] = useState('');
  const [status, setStatus] = useState('');

  const prevRowIndexRef = useRef<number | undefined>(undefined);
  const prevScheduleRef = useRef<typeof broadcastSchedule>(undefined);

  // 選択チームが変わった、またはCSVリロードでbroadcastScheduleが更新されたらフォームを上書き
  useEffect(() => {
    if (selectedRowIndex === undefined || selectedRowIndex === -1) return;
    const rowChanged = prevRowIndexRef.current !== selectedRowIndex;
    const scheduleChanged = prevScheduleRef.current !== broadcastSchedule;
    if (!rowChanged && !scheduleChanged) return;
    prevRowIndexRef.current = selectedRowIndex;
    prevScheduleRef.current = broadcastSchedule;

    const row = broadcastSchedule?.[selectedRowIndex];
    if (!row) return;
    setTeamName(row.displayTeamName || row.teamName);
    setPlayers([...row.players] as [string, string, string, string]);
    setRule(row.rule);
    setStatus('');
  }, [selectedRowIndex, broadcastSchedule]);

  const handleApply = async () => {
    try {
      setStatus('適用中...');
      await nodecg.sendMessage('setPlayerScreenDirect', { teamName, players, rule });
      setStatus(`✓ ${teamName}`);
    } catch (err) {
      setStatus(`エラー: ${(err as Error).message}`);
    }
  };

  return (
    <div className="container">
      <div className="field">
        <label className="label">チーム名表示</label>
        <input
          className="input"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label">ルール</label>
        <input
          className="input"
          value={rule}
          onChange={(e) => setRule(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label">プレイヤー</label>
        <div className="players">
          {players.map((name, i) => (
            <div key={i} className="player-row">
              <span className="player-num">{i + 1}</span>
              <input
                className="input"
                value={name}
                onChange={(e) => {
                  const next = [...players] as [string, string, string, string];
                  next[i] = e.target.value;
                  setPlayers(next);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        className="apply-button"
        onClick={handleApply}
        disabled={selectedRowIndex === undefined || selectedRowIndex === -1}
      >
        適用
      </button>
      <span className="status">{status}</span>
    </div>
  );
}
