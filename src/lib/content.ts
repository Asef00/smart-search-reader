import { document } from '../data/document';
import { createIndex, createVocabulary } from './search';

export const blocks = document.sections.flatMap(section => [
  { id: `${section.id}-title`, sectionId: section.id, text: section.title },
  ...section.paragraphs.map((text, i) => ({ id: `${section.id}-${i}`, sectionId: section.id, text })),
]);
// The static document is indexed once, outside React's render cycle.
export const searchIndex = createIndex(blocks);
export const vocabulary = createVocabulary(blocks);
export const formatNumber = (value: number) => value.toLocaleString('fa-IR');
