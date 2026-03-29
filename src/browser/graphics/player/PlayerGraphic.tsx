import { useReplicant } from '../../hooks/useReplicant';
import { FitText } from './FitText';
import './style.css';

type Props = {
  playerIndex: 0 | 1 | 2 | 3;
};

// ── 調整用定数 ───────────────────────────────────────────
const SLOT_START_TOP     = 262; // 最初のバーの top (px)
const SLOT_LEFT          = 40;  // バーの left (px, 共通)
const GAP_ACTIVE   = 26;  // active バーの前後の隙間 (px)
const GAP_INACTIVE = 17;  // inactive バーの前後の隙間 (px)

const INACTIVE = { width: 260, height: 40 } as const;
const ACTIVE   = { width: 320, height: 56 } as const;

const FONT_ACTIVE   = 32; // pt
const FONT_INACTIVE = 24; // pt

const RULE_BAR = { top: 935, left: 0, height: 36, width: 300 };
const TEAM_BAR = { top: 988, left: 0, height: 78, width: 500 };
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
        return (
          <FitText
            key={i}
            maxFontSize={isActive ? FONT_ACTIVE : FONT_INACTIVE}
            className={`player-slot ${isActive ? 'active' : 'inactive'}`}
            style={slot}
          >
            {name}
          </FitText>
        );
      })}

      {/* ルール */}
      <FitText maxFontSize={20} className="rule-slot" style={RULE_BAR}>
        {playerScreen.rule}
      </FitText>

      {/* チーム名 */}
      <FitText maxFontSize={40} className="team-slot" style={TEAM_BAR}>
        {playerScreen.teamName}
      </FitText>
    </div>
  );
}
