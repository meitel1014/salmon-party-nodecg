import { useReplicant } from '../../hooks/useReplicant';
import { FitText } from './FitText';
import './style.css';

type Props = {
  playerIndex: 0 | 1 | 2 | 3;
};

// ── 調整用定数 ───────────────────────────────────────────
const SLOT_START_TOP     = 262; // 最初のバーの top (px)
const SLOT_LEFT          = 20;  // バーの left (px, 共通)
const GAP_ACTIVE   = 26;  // active バーの前後の隙間 (px)
const GAP_INACTIVE = 17;  // inactive バーの前後の隙間 (px)

const INACTIVE = { width: 300, height: 40 } as const;
const ACTIVE   = { width: 365, height: 56 } as const;

const FONT_ACTIVE   = 32; // pt
const FONT_INACTIVE = 24; // pt

const RULE_BAR = { top: 935, left: 0, height: 36, width: 300 };
const TEAM_BAR = { top: 988, left: 20, height: 78, width: 450 };
// ────────────────────────────────────────────────────────

function buildSlot(i: number, playerIndex: number) {
  const gapOf = (j: number) => j === playerIndex ? GAP_ACTIVE : GAP_INACTIVE;
  let top = SLOT_START_TOP + gapOf(0);
  for (let j = 0; j < i; j++) {
    const size = j === playerIndex ? ACTIVE : INACTIVE;
    top += size.height + gapOf(j) + gapOf(j + 1);
  }
  const size = i === playerIndex ? ACTIVE : INACTIVE;
  return { top, left: SLOT_LEFT, ...size };
}

export function PlayerGraphic({ playerIndex }: Props) {
  const [playerScreen] = useReplicant('playerScreen');

  if (!playerScreen) return null;

  return (
    <div className="player-overlay">
      {/* プレイヤー名スロット */}
      {playerScreen.players.map((name, i) => {
        const isActive = i === playerIndex;
        const slot = buildSlot(i, playerIndex);
        // 固定サイズ・中央寄せは親ボックスが担い、font-size は継承させる。
        // FitText 自身の height は実行時に上書きされるため親に持たせる。
        return (
          <div
            key={i}
            className={`player-slot ${isActive ? 'active' : 'inactive'}`}
            style={{ ...slot, fontSize: `${isActive ? FONT_ACTIVE : FONT_INACTIVE}pt` }}
          >
            <FitText html={name} align="center" style={{ width: '100%', textAlign: 'center' }} />
          </div>
        );
      })}

      {/* ルール */}
      <div className="rule-slot" style={RULE_BAR}>
        <FitText html={playerScreen.rule} align="center" style={{ width: '100%', textAlign: 'center' }} />
      </div>

      {/* チーム名 */}
      <div className="team-slot" style={TEAM_BAR}>
        <FitText html={playerScreen.teamName} align="center" style={{ width: '100%', textAlign: 'center' }} />
      </div>
    </div>
  );
}
