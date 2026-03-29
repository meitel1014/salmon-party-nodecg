import { useState, useEffect, useRef } from 'react';
import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

export function App() {
  const [broadcastSchedule] = useReplicant('broadcastSchedule');
  const [selectedRowIndex] = useReplicant('selectedPlayerRowIndex');

  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<[string, string, string, string]>(['', '', '', '']);
  const [rule, setRule] = useState('');
  const [applyState, setApplyState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevRowIndexRef = useRef<number | undefined>(undefined);
  const prevScheduleRef = useRef<typeof broadcastSchedule>(undefined);

  // 選択チームが変わった、またはCSVリロードでbroadcastScheduleが更新されたらフォームを上書き
  useEffect(() => {
    if (selectedRowIndex == null) return;
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
  }, [selectedRowIndex, broadcastSchedule]);

  const handleApply = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // リップルエフェクト
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
      await nodecg.sendMessage('setPlayerScreenDirect', { teamName, players, rule });
      setApplyState('success');
    } catch {
      setApplyState('error');
    }
    resetTimerRef.current = setTimeout(() => setApplyState('idle'), 1500);
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
        className={`apply-button apply-button--${applyState}`}
        onClick={handleApply}
        disabled={selectedRowIndex == null || applyState === 'pending'}
      >
        適用
      </button>
    </div>
  );
}
