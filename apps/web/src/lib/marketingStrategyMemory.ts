export type StrategyMemoryEntry = {
  date: string;
  period: string;
  periodAnalyzed: string[];
  insights: string[];
  hypotheses: string[];
  decisions: string[];
  changes: string[];
  worked: string[];
  didNotWork: string[];
  learnings: string[];
  nextExperiments: string[];
  futureRecommendations: string[];
};

export type StrategyMemoryInput = {
  date: string;
  period: string;
  periodAnalyzed?: string[];
  insights?: string[];
  hypotheses?: string[];
  decisions?: string[];
  changes?: string[];
  worked?: string[];
  didNotWork?: string[];
  learnings?: string[];
  nextExperiments?: string[];
  futureRecommendations?: string[];
};

const ENTRY_START_MARKER = '<!-- STRATEGY_MEMORY_ENTRIES:START -->';
const ENTRY_END_MARKER = '<!-- STRATEGY_MEMORY_ENTRIES:END -->';

const FIELD_DEFINITIONS = [
  ['periodAnalyzed', 'Period analyzed'],
  ['insights', 'Insights detected'],
  ['hypotheses', 'Hypotheses'],
  ['decisions', 'Decisions taken'],
  ['changes', 'Changes vs previous strategy'],
  ['worked', 'What worked'],
  ['didNotWork', 'What did not work'],
  ['learnings', 'Learnings'],
  ['nextExperiments', 'Next experiments'],
  ['futureRecommendations', 'Recommendations for future content proposals'],
] as const;

type EntryField = (typeof FIELD_DEFINITIONS)[number][0];

const LABEL_TO_FIELD = new Map<string, EntryField>(
  FIELD_DEFINITIONS.map(([field, label]) => [normalizeLabel(label), field]),
);

const emptyEntryFields = () => ({
  periodAnalyzed: [],
  insights: [],
  hypotheses: [],
  decisions: [],
  changes: [],
  worked: [],
  didNotWork: [],
  learnings: [],
  nextExperiments: [],
  futureRecommendations: [],
});

export function parseStrategyMemoryMarkdown(markdown: string): StrategyMemoryEntry[] {
  const body = extractEntriesBody(markdown);
  const headingPattern = /^###\s+(\d{4}-\d{2}-\d{2})\s+\|\s+(.+?)\s*$/gm;
  const headings = [...body.matchAll(headingPattern)];

  return headings.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    const block = body.slice(start, end);
    const entry: StrategyMemoryEntry = {
      date: match[1],
      period: match[2].trim(),
      ...emptyEntryFields(),
    };

    for (const line of block.split('\n')) {
      const fieldMatch = line.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+?)\s*$/);
      if (!fieldMatch) {
        continue;
      }

      const field = LABEL_TO_FIELD.get(normalizeLabel(fieldMatch[1]));
      if (field) {
        entry[field] = splitFieldValue(fieldMatch[2]);
      }
    }

    return entry;
  }).sort(compareEntries);
}

export function appendStrategyMemoryEntry(markdown: string, input: StrategyMemoryInput) {
  const entry = normalizeInput(input);
  const entries = parseStrategyMemoryMarkdown(markdown);

  if (entries.some((current) => entryFingerprint(current) === entryFingerprint(entry))) {
    return markdown;
  }

  const nextEntries = [...entries, entry].sort(compareEntries);
  const nextBody = `\n\n${nextEntries.map(formatStrategyMemoryEntry).join('\n\n')}\n\n`;

  if (markdown.includes(ENTRY_START_MARKER) && markdown.includes(ENTRY_END_MARKER)) {
    return markdown.replace(
      new RegExp(`${escapeRegExp(ENTRY_START_MARKER)}[\\s\\S]*?${escapeRegExp(ENTRY_END_MARKER)}`),
      `${ENTRY_START_MARKER}${nextBody}${ENTRY_END_MARKER}`,
    );
  }

  const changelogHeading = '## Strategic Changelog';
  const changelogIndex = markdown.indexOf(changelogHeading);
  if (changelogIndex >= 0) {
    const insertAt = changelogIndex + changelogHeading.length;
    return `${markdown.slice(0, insertAt)}\n\n${ENTRY_START_MARKER}${nextBody}${ENTRY_END_MARKER}${markdown.slice(insertAt)}`;
  }

  return `${markdown.trimEnd()}\n\n${changelogHeading}\n\n${ENTRY_START_MARKER}${nextBody}${ENTRY_END_MARKER}\n`;
}

export function formatStrategyMemoryEntry(entry: StrategyMemoryEntry) {
  const lines = [`### ${entry.date} | ${entry.period}`];

  for (const [field, label] of FIELD_DEFINITIONS) {
    const values = entry[field];
    if (values.length) {
      lines.push(`- **${label}:** ${values.join('; ')}`);
    }
  }

  return lines.join('\n\n');
}

function extractEntriesBody(markdown: string) {
  const start = markdown.indexOf(ENTRY_START_MARKER);
  const end = markdown.indexOf(ENTRY_END_MARKER);

  if (start >= 0 && end > start) {
    return markdown.slice(start + ENTRY_START_MARKER.length, end);
  }

  const changelogIndex = markdown.indexOf('## Strategic Changelog');
  return changelogIndex >= 0 ? markdown.slice(changelogIndex) : markdown;
}

function normalizeInput(input: StrategyMemoryInput): StrategyMemoryEntry {
  return {
    date: input.date,
    period: input.period.trim(),
    periodAnalyzed: normalizeList(input.periodAnalyzed),
    insights: normalizeList(input.insights),
    hypotheses: normalizeList(input.hypotheses),
    decisions: normalizeList(input.decisions),
    changes: normalizeList(input.changes),
    worked: normalizeList(input.worked),
    didNotWork: normalizeList(input.didNotWork),
    learnings: normalizeList(input.learnings),
    nextExperiments: normalizeList(input.nextExperiments),
    futureRecommendations: normalizeList(input.futureRecommendations),
  };
}

function normalizeList(values: string[] = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function splitFieldValue(value: string) {
  return normalizeList(value.split(';'));
}

function compareEntries(a: Pick<StrategyMemoryEntry, 'date' | 'period'>, b: Pick<StrategyMemoryEntry, 'date' | 'period'>) {
  return a.date.localeCompare(b.date) || a.period.localeCompare(b.period);
}

function entryFingerprint(entry: StrategyMemoryEntry) {
  return JSON.stringify({
    date: entry.date,
    period: entry.period,
    periodAnalyzed: entry.periodAnalyzed,
    insights: entry.insights,
    hypotheses: entry.hypotheses,
    decisions: entry.decisions,
    changes: entry.changes,
    worked: entry.worked,
    didNotWork: entry.didNotWork,
    learnings: entry.learnings,
    nextExperiments: entry.nextExperiments,
    futureRecommendations: entry.futureRecommendations,
  });
}

function normalizeLabel(label: string) {
  return label.trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
