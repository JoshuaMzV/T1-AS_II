import React, { useState, useEffect, useRef, useMemo } from 'react';
import { transposeChord } from './musicUtils';

const styles = {
  chord: { fontWeight: 'bold', color: '#d63384', marginRight: 6 },
  comment: { fontStyle: 'italic', color: '#6c757d' },
  title: { fontWeight: 'bold', fontSize: '1.1em', display: 'block', marginTop: 6, marginBottom: 6 },
  sectionCard: { padding: 12 }
};

const REGEX_TOKENS = /(\{.*?\})|(\(.*?\))|(\[.*?\])/g;

const ChartRenderer = ({ text = '', transposeOffset = 0, chartType = 'both', layoutMode = 'paging' }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const containerRef = useRef(null);
  // itemsPerPage removed: we pack using container size and estimated heights
  // store container size so we can pack cards by available height
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });

  const regex = REGEX_TOKENS;
  const CARD_MIN_WIDTH = 320;
  const CARD_MIN_HEIGHT = 180;

  // Parse sections robustly: treat lines like [Coro] as section headers and
  // treat a single dot '.' on a line as an explicit separator. This keeps
  // long blocks together instead of splitting on blank lines which can
  // erroneously truncate multi-paragraph sections.
  const parseSectionsFromText = (txt) => {
    if (!txt || typeof txt !== 'string') return [];
    const lines = txt.split(/\r?\n/);
    const sectionsAcc = [];
    let current = [];

    const pushCurrent = () => {
      const s = current.join('\n').trim();
      if (s) sectionsAcc.push(s);
      current = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();

      // '.' on its own line is an explicit separator
      if (line === '.') {
        pushCurrent();
        continue;
      }

      // A header like [Coro] should start a new section. Treat empty
      // brackets '[]' as a terminator (they often appear in exported charts
      // and should not create an empty-titled section).
      if (/^\[.*\]$/.test(line)) {
        if (/^\[\s*\]$/.test(line)) {
          // empty brackets -> just end current section
          pushCurrent();
          continue;
        }
        // if we already have content, push previous section first
        if (current.length) pushCurrent();
        // start new section with the header line
        current.push(line);
        continue;
      }

      // Otherwise append the line to the current section (including blank lines)
      current.push(raw);
    }

    // push the last accumulated section
    pushCurrent();
    return sectionsAcc.length ? sectionsAcc : [txt.trim()];
  };

  const sections = useMemo(() => parseSectionsFromText(text), [text]);

  const shouldShowChord = (type) => type === 'both' || type === 'chords';
  const shouldShowNotes = (type) => type === 'both' || type === 'notes';

  useEffect(() => {
    if (layoutMode !== 'paging') return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const CARD_MIN_WIDTH = 320;
    const CARD_MIN_HEIGHT = 180;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      // keep container size for packing algorithm
      setContainerSize({ width, height });
  // kept for compatibility: width/height are stored in containerSize
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [layoutMode]);

  // Build pages as arrays of items (pageItems). We'll distribute items into
  // columns at render time using a masonry-style greedy algorithm so cards
  // of varying height are placed continuously and balance column heights.
  const pagesItems = useMemo(() => {
    // Pack sections into pages using container height to decide when to wrap
    const pages = [];
    if (!sections || sections.length === 0) return [[]];

    const availableWidth = containerSize && containerSize.width ? containerSize.width : (containerRef.current ? containerRef.current.clientWidth : 1200);
    const availableHeight = containerSize && containerSize.height ? Math.max(100, containerSize.height - 80) : (containerRef.current ? Math.max(100, containerRef.current.clientHeight - 80) : 600);
  const colCount = Math.max(1, Math.min(4, Math.floor(availableWidth / CARD_MIN_WIDTH)));

    // estimate height helper
    const estimateHeight = (txt) => (txt ? txt.split('\n').length : 1) * 18 + 48;

    let page = [];
    // We'll simulate columns heights and push items until no column can fit more
    let colHeights = Array.from({ length: colCount }, () => 0);

    const pushNewPage = () => {
      if (page.length) pages.push(page);
      page = [];
      colHeights = Array.from({ length: colCount }, () => 0);
    };

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const h = estimateHeight(s);
      // find shortest column that can fit this item
      let minIdx = 0;
      for (let j = 1; j < colHeights.length; j++) if (colHeights[j] < colHeights[minIdx]) minIdx = j;
      if (colHeights[minIdx] + h <= availableHeight) {
        // fits on current page
        page.push(s);
        colHeights[minIdx] += h;
      } else {
        // doesn't fit: try to see if any other column can fit
        let placed = false;
        for (let j = 0; j < colHeights.length; j++) {
          if (colHeights[j] + h <= availableHeight) {
            page.push(s);
            colHeights[j] += h;
            placed = true;
            break;
          }
        }
        if (!placed) {
          // start a new page and place there
          pushNewPage();
          // place into shortest column on fresh page
          page.push(s);
          colHeights[0] += h;
        }
      }
    }

    // push remaining
    if (page.length) pages.push(page);
    return pages.length ? pages : [[]];
  }, [sections, containerSize]);

  useEffect(() => {
    if (pageIndex >= pagesItems.length) setPageIndex(Math.max(0, pagesItems.length - 1));
  }, [pagesItems.length, pageIndex]);

  const renderTokens = (sectionText) => {
    if (!sectionText) return null;
    const tokens = sectionText.split(regex).filter(Boolean);
    return tokens.map((part, idx) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        const originalChord = part.slice(1, -1).trim();
        const transposed = transposeChord(originalChord, transposeOffset);
        if (!shouldShowChord(chartType)) return null;
        return <span key={`c-${idx}`} style={styles.chord}>{transposed}</span>;
      }
      if (part.startsWith('[') && part.endsWith(']')) {
        const titleText = part.slice(1, -1);
        if (!shouldShowNotes(chartType)) return null;
        return <div key={`t-${idx}`} style={styles.title}>{titleText}</div>;
      }
      if (part.startsWith('(') && part.endsWith(')')) {
        if (!shouldShowNotes(chartType)) return null;
        return <div key={`m-${idx}`} style={styles.comment}>{part}</div>;
      }
      if (!shouldShowNotes(chartType)) return null;
      return part.split('\n').map((ln, k) => <div key={`p-${idx}-${k}`}>{ln}</div>);
    });
  };

  // Render paging as discrete pages: show only current page and distribute
  // its sections into `cols` columns filled vertically.
  // currentPage is accessible via pagesColumns[pageIndex]

  const goPrev = React.useCallback(() => setPageIndex(p => Math.max(0, p - 1)), []);
  const goNext = React.useCallback(() => setPageIndex(p => Math.min(pagesItems.length - 1, p + 1)), [pagesItems.length]);

  // currentPage is already an array of columns (from pagesColumns)

  // Carousel behavior: render all pages in a horizontal track and slide between
  // them using translateX. This keeps each page a fixed viewport and provides
  // room for swipe gestures on mobile.
  const trackRef = useRef(null);
  const touch = useRef({ startX: 0, deltaX: 0, isDown: false });

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    const onTouchStart = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      touch.current = { startX: x, deltaX: 0, isDown: true };
    };
    const onTouchMove = (ev) => {
      if (!touch.current.isDown) return;
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      touch.current.deltaX = x - touch.current.startX;
    };
    const onTouchEnd = () => {
      if (!touch.current.isDown) return;
      const threshold = 60; // px required to trigger page change
      if (touch.current.deltaX > threshold) goPrev();
      else if (touch.current.deltaX < -threshold) goNext();
      touch.current = { startX: 0, deltaX: 0, isDown: false };
    };
    t.addEventListener('touchstart', onTouchStart, { passive: true });
    t.addEventListener('touchmove', onTouchMove, { passive: true });
    t.addEventListener('touchend', onTouchEnd);
    // also support mouse drag on desktop
    t.addEventListener('mousedown', onTouchStart);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('mouseup', onTouchEnd);
    return () => {
      t.removeEventListener('touchstart', onTouchStart);
      t.removeEventListener('touchmove', onTouchMove);
      t.removeEventListener('touchend', onTouchEnd);
      t.removeEventListener('mousedown', onTouchStart);
      window.removeEventListener('mousemove', onTouchMove);
      window.removeEventListener('mouseup', onTouchEnd);
    };
  }, [trackRef, pageIndex, goPrev, goNext]);

  const pageWidthStyle = { width: '100%', flex: '0 0 100%' };

  return (
    <div className="chart-renderer">
      {layoutMode === 'paging' ? (
        <div>
            <div className="paging-controls" style={{ marginBottom: 12 }}>
            <button onClick={goPrev} disabled={pageIndex === 0}>Prev</button>
            <div className="page-indicator">{pageIndex + 1} / {pagesItems.length}</div>
            <button onClick={goNext} disabled={pageIndex >= pagesItems.length - 1}>Next</button>
          </div>
          <div ref={containerRef} className="section-grid-paging-viewport" style={{ overflow: 'hidden' }}>
            <div ref={trackRef} className="pages-track" style={{ display: 'flex', transition: 'transform .36s cubic-bezier(.22,.9,.17,1)', transform: `translateX(-${pageIndex * 100}%)` }}>
              {pagesItems.map((pageItems, pi) => (
                <div key={`page-${pi}`} className="page-frame" style={pageWidthStyle}>
                  <div className="page-columns" style={{ display: 'flex', gap: 24 }}>
                    {/* Distribute items into columns using greedy shortest-column */}
                    {(() => {
                      const availableWidth = containerSize && containerSize.width ? containerSize.width : (containerRef.current ? containerRef.current.clientWidth : 1200);
                      const colCount = Math.max(1, Math.floor(availableWidth / CARD_MIN_WIDTH));
                      const columnsArr = Array.from({ length: colCount }, () => []);
                      const heights = Array.from({ length: colCount }, () => 0);
                      // estimate height by number of lines
                      const estimateHeight = (txt) => (txt ? txt.split('\n').length : 1) * 18 + 48;
                      for (let k = 0; k < pageItems.length; k++) {
                        const item = pageItems[k];
                        // find shortest column
                        let minIdx = 0;
                        for (let j = 1; j < heights.length; j++) if (heights[j] < heights[minIdx]) minIdx = j;
                        columnsArr[minIdx].push(item);
                        heights[minIdx] += estimateHeight(item);
                      }
                      return columnsArr.map((colItems, ci) => (
                        <div key={`col-${pi}-${ci}`} className="page-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
                          {colItems.map((sectionText, si) => (
                            <div key={`sec-${pi}-${ci}-${si}`} className="section-card" style={styles.sectionCard}>
                              {renderTokens(sectionText)}
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="scrolling-list">
          {sections.map((sectionText, si) => (
            <div key={`sec-${si}`} className="section-card fullwidth" style={styles.sectionCard}>
              {renderTokens(sectionText)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartRenderer;
