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
  const [itemsPerPage, setItemsPerPage] = useState(4);

  const regex = REGEX_TOKENS;

  const sections = useMemo(() => {
    if (!text || typeof text !== 'string') return [];
    const parts = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return parts.length ? parts : [text.trim()];
  }, [text]);

  const shouldShowChord = (type) => type === 'both' || type === 'chords';
  const shouldShowNotes = (type) => type === 'both' || type === 'notes';

  useEffect(() => {
    if (layoutMode !== 'paging') return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const CARD_MIN_WIDTH = 320;
      const CARD_MIN_HEIGHT = 180;
      const cols = Math.max(1, Math.floor(width / CARD_MIN_WIDTH));
      const rows = Math.max(1, Math.floor(Math.max(1, height - 60) / CARD_MIN_HEIGHT));
      const ipp = Math.max(1, cols * rows);
      setItemsPerPage(ipp);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [layoutMode]);

  const pages = useMemo(() => {
    const p = [];
    const ipp = Math.max(1, itemsPerPage || 1);
    for (let i = 0; i < sections.length; i += ipp) p.push(sections.slice(i, i + ipp));
    return p.length ? p : [[]];
  }, [sections, itemsPerPage]);

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(Math.max(0, pages.length - 1));
  }, [pages.length, pageIndex]);

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

  // New behavior: instead of Prev/Next paging we render a responsive grid
  // that fills the available space. Users can scroll naturally if content
  // overflows vertically. This matches the requested "fill the screen with
  // adaptive rectangles" behavior.
  return (
    <div className="chart-renderer">
      {layoutMode === 'paging' ? (
        <div ref={containerRef} className="section-grid">
          {sections.map((sectionText, si) => (
            <div key={`sec-${si}`} className="section-card" style={styles.sectionCard}>
              {renderTokens(sectionText)}
            </div>
          ))}
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
