import { useEffect, useMemo, useState } from 'react';
import { document as readerDocument } from './data/document';
import { blocks, formatNumber, searchIndex, vocabulary } from './lib/content';
import { findMatches, normalizeQuery, suggest } from './lib/search';
import type { Match } from './lib/search';
import { SearchBox } from './components/SearchBox';
import { HighlightedText } from './components/HighlightedText';
import { AppStatus } from './components/AppStatus';
import { Icon } from './components/Icon';
import './styles.css';

export default function App() {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = normalizeQuery(query);
  const matches = useMemo(() => findMatches(searchIndex, normalizedQuery), [normalizedQuery]);
  const suggestions = useMemo(() => suggest(vocabulary, normalizedQuery), [normalizedQuery]);
  const activeMatch = matches[activeIndex];
  const hasQuery = normalizedQuery.length > 0;

  const byBlock = useMemo(() => {
    const grouped = new Map<string, Match[]>();
    for (const match of matches) {
      const items = grouped.get(match.blockId) ?? [];
      items.push(match);
      grouped.set(match.blockId, items);
    }
    return grouped;
  }, [matches]);
  const groups = useMemo(() => readerDocument.sections.map(section => ({
    ...section,
    matches: matches.filter(match => match.sectionId === section.id),
  })).filter(section => section.matches.length), [matches]);

  const changeQuery = (value: string) => { setQuery(value); setActiveIndex(0); };
  const navigate = (direction: number) => {
    if (matches.length) setActiveIndex(current => (current + direction + matches.length) % matches.length);
  };

  useEffect(() => {
    if (!activeMatch) return;
    // Wait briefly for typing to settle; highlighting itself stays immediate.
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`match-${activeMatch.id}`);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'instant' : 'smooth' });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [activeMatch]);

  const highlight = (id: string, text: string) => <HighlightedText
    key={`${id}-${normalizedQuery}`} text={text} matches={byBlock.get(id) ?? []} activeId={activeMatch?.id} />;

  return <>
    <a className="skip-link" href="#reading-content">رفتن به متن</a>
    <header className="site-header">
      <div className="brand"><span className="brand-icon"><Icon name="book" size={25} /></span>
        <div><strong>متن‌خوان</strong><span lang="en" dir="ltr">SMART SEARCH READER</span></div>
      </div>
      <AppStatus />
    </header>

    <main className="page">
      <section className="intro" aria-labelledby="page-title">
        <div><p className="eyebrow"><span />یک متن، چند مسیر برای کشف</p>
          <h1 id="page-title">کلمه را پیدا کن.<br className="mobile-break" /> <span>معنا را دنبال کن.</span></h1>
          <p className="intro-description">در متن جستجو کنید و با هر نتیجه، کمی دقیق‌تر بخوانید.</p>
        </div>
        <div className="intro-note"><Icon name="book" size={25} /><span>برای خواندن با تمرکز<small>ساده، سریع و همیشه در دسترس</small></span></div>
      </section>

      <div className="search-toolbar">
        <SearchBox query={query} onChange={changeQuery} suggestions={suggestions} onNavigate={navigate} />
        <div className="result-toolbar">
          <span className="search-status" role="status" aria-live="polite" aria-atomic="true">
            {!hasQuery ? 'جستجو در همین متن' : matches.length
              ? <><b>{formatNumber(activeIndex + 1)}</b> از <b>{formatNumber(matches.length)}</b> نتیجه</>
              : 'نتیجه‌ای پیدا نشد'}
          </span>
          {matches.length > 1 && <div className="match-navigation" aria-label="حرکت بین نتایج">
            <button className="icon-button" aria-label="نتیجهٔ قبلی" title="نتیجهٔ قبلی · Shift + Enter" onClick={() => navigate(-1)}><Icon name="up" /></button>
            <button className="icon-button" aria-label="نتیجهٔ بعدی" title="نتیجهٔ بعدی · Enter" onClick={() => navigate(1)}><Icon name="down" /></button>
          </div>}
        </div>
      </div>

      <div className="workspace">
        <aside className="sidebar" aria-label={hasQuery ? 'نتایج جستجو' : 'راهنمای مطالعه'}>
          <div className="sidebar-heading"><h2>{hasQuery ? 'نتایج جستجو' : 'در این متن'}</h2><span>{formatNumber(hasQuery ? matches.length : readerDocument.sections.length)}</span></div>
          {hasQuery ? <>
            <p className="sidebar-caption">{matches.length ? `${formatNumber(matches.length)} تطابق در ${formatNumber(groups.length)} بخش` : 'عبارت دیگری را امتحان کنید.'}</p>
            {!matches.length && <div className="empty-state"><Icon name="search" size={30} /><strong>این عبارت در متن نیست</strong><p>املای کلمه را بررسی کنید یا عبارت کوتاه‌تری بنویسید.</p><button onClick={() => changeQuery('')}>پاک کردن عبارت</button></div>}
            <ul className="result-list">{groups.map(group => {
              const firstMatch = group.matches[0]!;
              const block = blocks.find(item => item.id === firstMatch.blockId)!;
              return <li key={group.id}><button
                className={activeMatch?.sectionId === group.id ? 'result-card selected' : 'result-card'}
                aria-current={activeMatch?.sectionId === group.id ? 'true' : undefined}
                onClick={() => {
                  const nextIndex = matches.findIndex(match => match.id === firstMatch.id);
                  setActiveIndex(nextIndex);
                  // Clicking the already active group should return to its match too.
                  if (nextIndex === activeIndex) document.getElementById(`match-${firstMatch.id}`)?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
                }}>
                <span className="result-title">{group.title}<span className="count-badge">{formatNumber(group.matches.length)}</span></span>
                <span className="snippet">{firstMatch.start > 25 ? '…' : ''}{block.text.slice(Math.max(0, firstMatch.start - 25), firstMatch.start)}<strong>{block.text.slice(firstMatch.start, firstMatch.end)}</strong>{block.text.slice(firstMatch.end, firstMatch.end + 42)}{firstMatch.end + 42 < block.text.length ? '…' : ''}</span>
              </button></li>;
            })}</ul>
          </> : <>
            <p className="sidebar-caption">یادداشتی دربارهٔ مطالعهٔ دیجیتال</p>
            <nav aria-label="فهرست متن"><ol className="contents-list">{readerDocument.sections.map((section, i) =>
              <li key={section.id}><a href={`#${section.id}`}><span>{formatNumber(i + 1).padStart(2, '۰')}</span>{section.title}</a></li>
            )}</ol></nav>
            <div className="try-search"><span className="small-label">از اینجا شروع کنید</span><p>یک کلمه، چند جای متن.</p><div>{['جستجو', 'خواندن', 'آفلاین'].map(word => <button key={word} onClick={() => changeQuery(word)}>{word}<Icon name="arrow" size={14} /></button>)}</div></div>
          </>}
          <div className="keyboard-note"><span><kbd>Enter</kbd> نتیجهٔ بعدی</span><span><kbd>Shift + Enter</kbd> نتیجهٔ قبلی</span></div>
        </aside>

        <article id="reading-content" className="reader" tabIndex={-1} aria-labelledby="document-title">
          <header className="document-header"><div className="document-meta"><span>یادداشت مطالعه</span><span>حدود ۶ دقیقه خواندن</span></div>
            <h2 id="document-title">{readerDocument.title}</h2><p>{readerDocument.subtitle}</p>
            <div className="document-rule"><span>متن نمونه</span><i /></div>
          </header>
          {readerDocument.sections.map((section, i) => <section key={section.id} id={section.id} className="reading-section" aria-labelledby={`${section.id}-heading`}>
            <div className="section-heading"><span className="section-number" aria-hidden="true">{formatNumber(i + 1).padStart(2, '۰')}</span><h3 id={`${section.id}-heading`}>{highlight(`${section.id}-title`, section.title)}</h3>
              {hasQuery && matches.some(match => match.sectionId === section.id) && <span className="section-count">{formatNumber(groups.find(group => group.id === section.id)!.matches.length)} تطابق</span>}
            </div>
            {section.paragraphs.map((paragraph, j) => <p key={j}>{highlight(`${section.id}-${j}`, paragraph)}</p>)}
          </section>)}
          <footer className="document-footer"><span />پایان متن<span /></footer>
        </article>
      </div>
      <footer className="page-footer"><span>متن‌خوان هوشمند</span><span>پیدا کنید. بخوانید. ادامه دهید.</span></footer>
    </main>
  </>;
}
