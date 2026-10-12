import { describe, expect, it } from 'vitest';
import { createIndex, createVocabulary, findMatches, normalizeQuery, suggest } from './search';

const indexOf = (text: string) => createIndex([{ id: 'body', sectionId: 'intro', text }]);
const extracts = (text: string, query: string) => findMatches(indexOf(text), query).map(match => text.slice(match.start, match.end));

describe('literal search', () => {
  it('does not match an empty or whitespace-only query', () => {
    expect(findMatches(indexOf('متن نمونه'), '')).toEqual([]);
    expect(findMatches(indexOf('متن نمونه'), '  \n\u200c')).toEqual([]);
  });
  it('returns every non-overlapping occurrence in reading order', () => {
    const matches = findMatches(indexOf('متن متن متن'), 'متن');
    expect(matches.map(({ start, end }) => [start, end])).toEqual([[0, 3], [4, 7], [8, 11]]);
    expect(new Set(matches.map(match => match.id)).size).toBe(3);
    expect(extracts('banana', 'ana')).toEqual(['ana']);
  });
  it('handles phrases, partial words and case-insensitive Latin input', () => {
    expect(extracts('React و REACT در react', 'rEaCt')).toEqual(['React', 'REACT', 'react']);
    expect(extracts('تجربه کاربری مناسب', 'تجربه کاربری')).toEqual(['تجربه کاربری']);
    expect(extracts('خواندن و خواننده', 'خوان')).toEqual(['خوان', 'خوان']);
  });
  it('treats regex and HTML characters as plain text', () => {
    expect(extracts('a.b a*b [x] <script>', 'a.b')).toEqual(['a.b']);
    expect(extracts('a.b a*b [x] <script>', '[x]')).toEqual(['[x]']);
    expect(extracts('a.b a*b [x] <script>', '<script>')).toEqual(['<script>']);
    expect(findMatches(indexOf('anything'), '.*')).toEqual([]);
  });
  it('preserves block and section identity and never crosses paragraphs', () => {
    const index = createIndex([
      { id: 'a', sectionId: 'one', text: 'اولین متن' },
      { id: 'b', sectionId: 'two', text: 'متن بعدی' },
    ]);
    expect(findMatches(index, 'متن').map(m => [m.blockId, m.sectionId])).toEqual([['a', 'one'], ['b', 'two']]);
    expect(findMatches(index, 'متن متن')).toEqual([]);
  });
});

describe('Persian normalization and original offsets', () => {
  it('unifies Arabic/Persian letters without changing visible text', () => {
    expect(extracts('كتاب کتاب كِتاب', 'کتاب')).toEqual(['كتاب', 'کتاب', 'كِتاب']);
    expect(extracts('علي علی', 'علی')).toEqual(['علي', 'علی']);
  });
  it('equates ZWNJ and whitespace, including repeated whitespace', () => {
    expect(extracts('می‌توان می توان می  توان', 'می توان')).toEqual(['می‌توان', 'می توان', 'می  توان']);
    expect(normalizeQuery('  می\n  توان ')).toBe('می توان');
  });
  it('keeps offsets correct around diacritics, tatweel and emoji', () => {
    expect(extracts('📖 کِتاب و کـتابِ', 'کتاب')).toEqual(['کِتاب', 'کـتابِ']);
    expect(extracts('📖 متن 📖', '📖')).toEqual(['📖', '📖']);
  });
  it('returns no matches for a missing phrase or diacritics alone', () => {
    expect(extracts('متن', 'نیست')).toEqual([]);
    expect(extracts('متن', 'ِ')).toEqual([]);
  });
});

describe('autocomplete', () => {
  const vocabulary = createVocabulary(indexOf('خواندن خواندن خواننده خوانا كتاب کتاب React react'));
  it('ranks existing words by frequency and limits results', () => {
    expect(suggest(vocabulary, 'خوا', 2).map(s => s.word)).toEqual(['خواندن', 'خوانا']);
    expect(suggest(vocabulary, 'نیست')).toEqual([]);
  });
  it('merges normalized duplicates and excludes exact queries', () => {
    expect(suggest(vocabulary, 'ک')[0]).toEqual({ word: 'كتاب', count: 2 });
    expect(suggest(vocabulary, 'REA')[0]).toEqual({ word: 'React', count: 2 });
    expect(suggest(vocabulary, 'خواندن')).toEqual([]);
    expect(suggest(vocabulary, '   ')).toEqual([]);
  });
});
