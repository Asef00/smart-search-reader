import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Suggestion } from '../lib/search';
import { formatNumber } from '../lib/content';
import { Icon } from './Icon';

interface Props {
  query: string;
  onChange: (value: string) => void;
  suggestions: Suggestion[];
  onNavigate: (direction: number) => void;
}

export function SearchBox({ query, onChange, suggestions, onNavigate }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const expanded = open && suggestions.length > 0;
  const choose = (word: string) => {
    onChange(word);
    setOpen(false);
    setSelected(-1);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setSelected(previous => !expanded || previous < 0
        ? (step === 1 ? 0 : suggestions.length - 1)
        : (previous + step + suggestions.length) % suggestions.length);
      setOpen(true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = expanded ? suggestions[selected] : undefined;
      if (option) choose(option.word);
      else { setOpen(false); onNavigate(event.shiftKey ? -1 : 1); }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setSelected(-1);
    }
  };

  return <div className="search-box" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label htmlFor={id} className="sr-only">جستجو در متن</label>
    <Icon name="search" size={22} />
    <input ref={input} id={id} role="combobox" type="text" value={query}
      placeholder="کلمه یا عبارتی را جستجو کنید…" autoComplete="off" spellCheck={false}
      aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={expanded ? `${id}-list` : undefined}
      aria-activedescendant={expanded && selected >= 0 ? `${id}-option-${selected}` : undefined}
      aria-describedby={`${id}-help`} maxLength={200}
      onFocus={() => { setOpen(true); setSelected(-1); }}
      onKeyDown={onKeyDown}
      onChange={event => { onChange(event.target.value); setOpen(true); setSelected(-1); }} />
    <span id={`${id}-help`} className="sr-only">بالا و پایین برای مرور پیشنهادها، Enter برای انتخاب یا نتیجهٔ بعدی، Shift و Enter برای نتیجهٔ قبلی.</span>
    {query && <button className="icon-button clear-button" aria-label="پاک کردن جستجو" onClick={() => {
      onChange(''); setSelected(-1); input.current?.focus();
    }}><Icon name="close" size={18} /></button>}
    {expanded && <div className="suggestion-panel">
      <p className="suggestion-label">پیشنهاد از همین متن</p>
      <ul id={`${id}-list`} role="listbox" aria-label="پیشنهادهای جستجو">
        {suggestions.map((suggestion, i) => <li key={suggestion.word} role="option"
          id={`${id}-option-${i}`} aria-selected={selected === i}
          onPointerDown={event => event.preventDefault()}
          onClick={() => choose(suggestion.word)}>
          <span><Icon name="search" size={16} />{suggestion.word}</span>
          <small>{formatNumber(suggestion.count)} بار در متن</small>
        </li>)}
      </ul>
    </div>}
  </div>;
}
