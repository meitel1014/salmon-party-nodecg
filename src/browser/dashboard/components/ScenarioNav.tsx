import type { ScenarioInfo } from '../../../schemas';
import './ScenarioNav.css';

type Props = {
  scenarioList: ScenarioInfo[] | undefined;
  currentScenarioNumber: number | null;
  onScenarioChange: (scenarioNumber: number) => void;
  children?: React.ReactNode;
};

export function ScenarioNav({ scenarioList, currentScenarioNumber, onScenarioChange, children }: Props) {
  const count = scenarioList?.length ?? 0;
  const currentIdx = scenarioList?.findIndex((s) => s.scenarioNumber === currentScenarioNumber) ?? -1;
  const current = scenarioList?.[currentIdx];

  return (
    <div className="scenario-nav">
      <button
        className="nav-btn"
        onClick={() => {
          if (scenarioList && currentIdx > 0) onScenarioChange(scenarioList[currentIdx - 1].scenarioNumber);
        }}
        disabled={currentIdx <= 0}
      >
        ←
      </button>
      <span className="scenario-label">
        {current ? `${current.displayName}（${current.rule}）` : '読み込み中...'}
      </span>
      <button
        className="nav-btn"
        onClick={() => {
          if (scenarioList && currentIdx < count - 1) onScenarioChange(scenarioList[currentIdx + 1].scenarioNumber);
        }}
        disabled={currentIdx >= count - 1}
      >
        →
      </button>
      {children}
    </div>
  );
}
