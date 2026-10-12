import { Fragment } from 'react';
import type { Match } from '../lib/search';

export function HighlightedText({ text, matches, activeId }: { text: string; matches: Match[]; activeId?: string }) {
  return <>{matches.map((match, index) => {
    const before = text.slice(matches[index - 1]?.end ?? 0, match.start);
    return <Fragment key={match.id}>{before}<mark
      id={`match-${match.id}`}
      className={match.id === activeId ? 'match match-active' : 'match'}
      aria-current={match.id === activeId ? 'true' : undefined}
    >{text.slice(match.start, match.end)}</mark></Fragment>;
  })}{text.slice(matches.at(-1)?.end ?? 0)}</>;
}
