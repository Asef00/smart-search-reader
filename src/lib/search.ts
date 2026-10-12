export interface NormalizedText {
  value: string;
  starts: number[];
  ends: number[];
}

export interface TextBlock { id: string; sectionId: string; text: string }
export interface IndexedBlock extends TextBlock { normalized: NormalizedText }
export interface Match { id: string; blockId: string; sectionId: string; start: number; end: number }
export interface Suggestion { word: string; count: number }

// Keep original UTF-16 offsets: normalization must never shift a highlight.
export function normalizeText(text: string): NormalizedText {
  let value = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const character of text) {
    const start = offset;
    offset += character.length;
    if (/[\u064b-\u065f\u0670\u0640]/u.test(character)) {
      if (ends.length) ends[ends.length - 1] = offset;
      continue;
    }
    const normalized = character.replace(/[يى]/gu, 'ی').replace(/ك/gu, 'ک')
      .replace(/[\s\u200c]/gu, ' ').toLowerCase();
    if (normalized === ' ' && value.endsWith(' ')) {
      ends[ends.length - 1] = offset;
      continue;
    }
    value += normalized;
    for (let i = 0; i < normalized.length; i++) {
      starts.push(start);
      ends.push(offset);
    }
  }
  return { value, starts, ends };
}

export function normalizeQuery(query: string): string {
  return normalizeText(query).value.trim();
}

export function createIndex(blocks: TextBlock[]): IndexedBlock[] {
  return blocks.map(block => ({ ...block, normalized: normalizeText(block.text) }));
}

// Literal, non-overlapping substring search. User input is never a RegExp or HTML.
export function findMatches(index: IndexedBlock[], query: string): Match[] {
  const needle = normalizeQuery(query);
  if (!needle) return [];
  const matches: Match[] = [];
  for (const block of index) {
    let position = block.normalized.value.indexOf(needle);
    while (position !== -1) {
      const start = block.normalized.starts[position];
      const end = block.normalized.ends[position + needle.length - 1];
      if (start !== undefined && end !== undefined) {
        matches.push({ id: `${block.id}-${start}`, blockId: block.id, sectionId: block.sectionId, start, end });
      }
      position = block.normalized.value.indexOf(needle, position + needle.length);
    }
  }
  return matches;
}

export function createVocabulary(blocks: TextBlock[]): Suggestion[] {
  const words = new Map<string, Suggestion>();
  for (const block of blocks) {
    for (const token of block.text.match(/[\p{L}\p{M}]+(?:\u200c[\p{L}\p{M}]+)*/gu) ?? []) {
      const key = normalizeQuery(token);
      if (key.length < 2) continue;
      const previous = words.get(key);
      if (previous) previous.count++;
      else words.set(key, { word: token, count: 1 });
    }
  }
  return [...words.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'fa'));
}

export function suggest(vocabulary: Suggestion[], query: string, limit = 5): Suggestion[] {
  const needle = normalizeQuery(query);
  if (!needle) return [];
  return vocabulary.filter(({ word }) => {
    const normalized = normalizeQuery(word);
    return normalized.startsWith(needle) && normalized !== needle;
  }).slice(0, limit);
}
