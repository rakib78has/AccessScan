/**
 * Turns axe's compact WCAG tags into readable labels:
 *   "wcag111"  → criterion "1.1.1"
 *   "wcag1411" → criterion "1.4.11"
 *   "wcag21aa" → level "WCAG 2.1 AA"
 */

const CRITERION = /^wcag(\d)(\d)(\d{1,2})$/;
const LEVEL = /^wcag(2)(\d?)(a{1,3})$/;

export interface WcagLabels {
  criteria: string[];
  levels: string[];
}

export function formatWcagTags(tags: readonly string[]): WcagLabels {
  const criteria: string[] = [];
  const levels: string[] = [];
  for (const tag of tags) {
    const level = LEVEL.exec(tag);
    if (level) {
      const [, major = '2', minor, grade = 'a'] = level;
      levels.push(`WCAG ${major}.${minor || '0'} ${grade.toUpperCase()}`);
      continue;
    }
    const criterion = CRITERION.exec(tag);
    if (criterion) criteria.push(criterion.slice(1).join('.'));
  }
  return { criteria, levels };
}
