import { useState, useRef } from 'react';
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

  // 選択チームが変わった、またはCSVリロードでbroadcastScheduleが更新されたらフォームを上書きする。
  // effect 内で setState するとカスケードレンダリングになるため、React 公式推奨どおり
  // 「直前の値を state で保持し、変化を検知したら render 中に調整」する形にしている。
  const [syncedRowIndex, setSyncedRowIndex] = useState(selectedRowIndex);
  const [syncedSchedule, setSyncedSchedule] = useState(broadcastSchedule);
  if (selectedRowIndex !== syncedRowIndex || broadcastSchedule !== syncedSchedule) {
    setSyncedRowIndex(selectedRowIndex);
    setSyncedSchedule(broadcastSchedule);
    const row = selectedRowIndex == null ? undefined : broadcastSchedule?.[selectedRowIndex];
    if (row) {
      setTeamName(row.displayTeamName || row.teamName);
      setPlayers([...row.players] as [string, string, string, string]);
      setRule(row.rule);
    }
  }

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
