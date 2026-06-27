import { describe, expect, it } from 'vitest';
import {
  appendStrategyMemoryEntry,
  formatStrategyMemoryEntry,
  parseStrategyMemoryMarkdown,
  type StrategyMemoryEntry,
} from '../marketingStrategyMemory';

const baseMarkdown = `# Strategy

## Strategic Changelog

<!-- STRATEGY_MEMORY_ENTRIES:START -->

### 2026-06-29 | 2026-06 MVP baseline

- **Period analyzed:** 2026-06 MVP

- **Insights detected:** CSV export works

<!-- STRATEGY_MEMORY_ENTRIES:END -->
`;

const newEntry = {
  date: '2026-07-31',
  period: '2026-07 monthly run',
  periodAnalyzed: ['2026-07-01 -> 2026-07-31'],
  insights: ['Landing CTA clicks increased after product screenshots'],
  hypotheses: ['Demo posts may outperform abstract habit advice'],
  decisions: ['Increase product mechanism posts'],
  changes: ['Shift from proof-of-publishing to activation learning'],
  worked: ['Screenshot-led posts'],
  didNotWork: ['Generic motivational copy'],
  learnings: ['Separate landing interest from product usage'],
  nextExperiments: ['Test dashboard walkthrough carousel'],
  futureRecommendations: ['Tie every hook to one measurable funnel event'],
};

describe('marketing strategy memory', () => {
  it('parses changelog entries from the persistent Markdown format', () => {
    const entries = parseStrategyMemoryMarkdown(baseMarkdown);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      date: '2026-06-29',
      period: '2026-06 MVP baseline',
      periodAnalyzed: ['2026-06 MVP'],
      insights: ['CSV export works'],
    });
  });

  it('appends a new entry without deleting previous history', () => {
    const nextMarkdown = appendStrategyMemoryEntry(baseMarkdown, newEntry);
    const entries = parseStrategyMemoryMarkdown(nextMarkdown);

    expect(entries.map((entry) => entry.period)).toEqual([
      '2026-06 MVP baseline',
      '2026-07 monthly run',
    ]);
    expect(nextMarkdown).toContain('CSV export works');
    expect(nextMarkdown).toContain('Landing CTA clicks increased after product screenshots');
  });

  it('keeps entries in chronological order', () => {
    const nextMarkdown = appendStrategyMemoryEntry(baseMarkdown, {
      date: '2026-05-31',
      period: '2026-05 imported note',
      insights: ['Earlier strategic context'],
    });

    expect(parseStrategyMemoryMarkdown(nextMarkdown).map((entry) => entry.date)).toEqual([
      '2026-05-31',
      '2026-06-29',
    ]);
  });

  it('does not duplicate an identical entry', () => {
    const once = appendStrategyMemoryEntry(baseMarkdown, newEntry);
    const twice = appendStrategyMemoryEntry(once, newEntry);

    expect(parseStrategyMemoryMarkdown(twice)).toHaveLength(2);
    expect(twice).toBe(once);
  });

  it('formats an entry with the expected strategic sections', () => {
    const formatted = formatStrategyMemoryEntry(newEntry as StrategyMemoryEntry);

    expect(formatted).toContain('### 2026-07-31 | 2026-07 monthly run');
    expect(formatted).toContain('**Insights detected:**');
    expect(formatted).toContain('**Recommendations for future content proposals:**');
  });
});
