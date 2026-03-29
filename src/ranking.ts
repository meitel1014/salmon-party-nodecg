import type { AggregationRow } from './schemas';
import { usesRedEgg, isAscendingRule } from './rules';

export function sortByRanking(rows: AggregationRow[], rule: string): AggregationRow[] {
  const redEgg = usesRedEgg(rule);
  const ascending = isAscendingRule(rule);
  return [...rows].sort((a, b) => {
    const aScore = redEgg ? a.redEgg : a.goldenEgg;
    const bScore = redEgg ? b.redEgg : b.goldenEgg;
    const primary = ascending ? aScore - bScore : bScore - aScore;
    if (primary !== 0 || redEgg) return primary;
    return b.redEgg - a.redEgg;
  });
}
