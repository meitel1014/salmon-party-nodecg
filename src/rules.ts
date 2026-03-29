export const RULES = {
  RAMPAGE:    '乱獲',
  PRINCESS:   '姫鮭',
  LOW_POINT:  'ローポイント',
  RED_RAMPAGE: '赤乱獲',
} as const;

export type Rule = typeof RULES[keyof typeof RULES];

/** 赤イクラをスコアとして使うルールか */
export function usesRedEgg(rule: string): boolean {
  return rule === RULES.LOW_POINT || rule === RULES.RED_RAMPAGE;
}

/** スコアを昇順（小さいほど高順位）にするルールか */
export function isAscendingRule(rule: string): boolean {
  return rule === RULES.LOW_POINT;
}

/** ルール名に対応する表示色を返す */
export function getRuleColor(rule: string): string {
  switch (rule) {
    case RULES.RAMPAGE:    return '#222222';
    case RULES.PRINCESS:   return '#e58110';
    case RULES.LOW_POINT:  return '#4a85d8';
    case RULES.RED_RAMPAGE: return '#cc0000';
    default:               return '#555555';
  }
}
