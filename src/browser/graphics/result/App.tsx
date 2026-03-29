import { useReplicant } from '../../hooks/useReplicant';
import './style.css';

function getRuleColor(rule: string): string {
  switch (rule) {
    case '乱獲':     return '#222222';
    case '姫鮭':     return '#e58110';
    case 'ローポイント': return '#4a85d8';
    case '赤乱獲':   return '#cc0000';
    default:         return '#555555';
  }
}

export function ResultGraphic() {
  const [resultScreen] = useReplicant('resultScreen');

  if (!resultScreen || resultScreen.rankings.length === 0) return null;

  return (
    <div className="result-overlay">
      <span className="subtitle">
        {resultScreen.scenarioDisplayName}&nbsp;&nbsp;  -&nbsp;
        <span style={{ color: getRuleColor(resultScreen.rule) }}>{resultScreen.rule}</span>
        &nbsp;-
      </span>

      <div className="rankings">
        {resultScreen.rankings.map((entry) => (
          <div key={entry.rank} className="ranking-row">
            <span className="team-name">{entry.teamName}</span>
            <span className="score">{entry.score.toLocaleString()}個</span>
          </div>
        ))}
      </div>
    </div>
  );
}
