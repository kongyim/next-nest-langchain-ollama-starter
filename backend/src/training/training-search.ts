export interface SearchableTrainingEntry {
  id: string;
  title: string;
  content: string;
}

export interface TrainingSearchResult {
  id: string;
  title: string;
  score: number;
  snippet: string;
}

export function rankTrainingEntries(
  query: string,
  entries: SearchableTrainingEntry[],
  limit = 3,
  snippetLength = 180,
): TrainingSearchResult[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [];
  }

  const tokens = cleanQuery
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length >= 2);

  if (tokens.length === 0) {
    return [];
  }

  return entries
    .map((entry) => {
      const haystack = `${entry.title}\n${entry.content}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += 1;
        }
      }

      return {
        id: entry.id,
        title: entry.title,
        score,
        snippet: toSnippet(entry.content, snippetLength),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(10, limit)));
}

function toSnippet(content: string, maxLength: number): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength)}...`;
}
