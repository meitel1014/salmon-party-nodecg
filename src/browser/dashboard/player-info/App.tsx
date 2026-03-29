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

  // 選択チームが変わったらフォームを上書き
  useEffect(() => {
    if (selectedRowIndex === undefined || selectedRowIndex === -1) return;
    if (prevRowIndexRef.current === selectedRowIndex) return;
    prevRowIndexRef.current = selectedRowIndex;

    const row = broadcastSchedule?.[selectedRowIndex];
    if (!row) return;
    setTeamName(row.teamName);
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
        <label className="label">チーム名</label>
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

      <button className="apply-button" onClick={handleApply}>
        適用
      </button>
      <span className="status">{status}</span>
    </div>
  );
}
