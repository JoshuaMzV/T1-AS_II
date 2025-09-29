import React, { useMemo, useState, useRef } from 'react';

// Mapa simple de etiquetas a tipos y colores
const SECTION_MAP = [
  // Versos (1,2...) → Morado
  { match: /^v(?:erse|erso)?\s*1$/i, key: 'V1', color: '#8A2BE2' },
  { match: /^v(?:erse|erso)?\s*2$/i, key: 'V2', color: '#8A2BE2' },
  { match: /^v(?:erse|erso)?\s*3$/i, key: 'V3', color: '#8A2BE2' },
  // Coro → Naranja
  { match: /^coro$/i, key: 'C', color: '#FF7F50' },
  // Puente → Azul
  { match: /^puente$/i, key: 'PU', color: '#1E90FF' },
  // Precoro → Amarillo
  { match: /^precoro$/i, key: 'PC', color: '#FFB347' },
  // Instrumental → Celeste
  { match: /^instrumental$/i, key: 'I', color: '#00BFFF' },
  // Intro → Rojo
  { match: /^intro$/i, key: 'Intro', color: '#FF6347' },
  // Final → Corinto (tonalidad vino/marrón oscuro)
  { match: /^final$/i, key: 'Final', color: '#800000' },
];

function detectSection(label) {
  const clean = label.replace(/^\[|\]$/g, '').trim();
  for (const s of SECTION_MAP) {
    if (s.match.test(clean)) return { key: s.key, color: s.color, label: clean };
  }
  // Si no coincide, devolvemos como genérico (clave única basada en texto)
  return { key: clean || 'S', color: '#9e9e9e', label: clean || 'Sección' };
}

const SectionsOverview = ({ chart, onSelectSection, layoutMode = 'paging', chartType = 'both' }) => {
  const [activeKey, setActiveKey] = useState(null);
  const containerRef = useRef(null);

  const sections = useMemo(() => {
    if (!chart || !chart.cuerpo) return [];
    const lines = chart.cuerpo.split('\n');
    const out = [];
    let current = { title: 'Sin título', body: '' };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const titleMatch = /^\[(.*)\]$/.exec(line);
      if (titleMatch) {
        // Push previous if tiene body
        if (current.body || current.title !== 'Sin título') out.push(current);
        current = { title: titleMatch[1].trim(), body: '' };
      } else {
        current.body += (current.body ? '\n' : '') + line;
      }
    }
    if (current.body || current.title !== 'Sin título') out.push(current);
    return out;
  }, [chart]);

  // Mapeamos cada sección a una estructura con tipo/color y primer preview
  const mapped = sections.map(sec => ({ ...detectSection(sec.title), text: sec.body }));

  const shouldShowChord = (type) => type === 'both' || type === 'chords';
  const shouldShowNotes = (type) => type === 'both' || type === 'notes';

  // NOTE: We intentionally render a responsive grid that fills the available
  // viewport area. We keep containerRef in case future heuristics are needed.

  const handleClick = (key) => {
    // Toggle: si ya está activa, la deseleccionamos
    if (activeKey === key) {
      setActiveKey(null);
      if (onSelectSection) onSelectSection(null);
    } else {
      setActiveKey(key);
      if (onSelectSection) onSelectSection(key);
    }
  };

  return (
    <div className="sections-overview">
      {mapped.length === 0 && <div className="empty-overview">No hay secciones detectadas.</div>}
    {/* layoutMode switch is handled by parent; when 'scrolling' we add a modifier class
      so CSS can render full-width vertical cards. Default is 'paging' (grid). */}
    <div className={`sections-grid ${layoutMode === 'scrolling' ? 'scrolling' : ''}`} ref={containerRef}>
        {mapped.map((s, idx) => {
          const isActive = activeKey === s.key;

          // Construir pares (acordes + letra) para mini-preview
          const lines = s.text ? s.text.split('\n').map(l => l.trim()).filter(Boolean) : [];
          const pairs = [];
          for (let i = 0; i < lines.length && pairs.length < 2; i++) {
            const line = lines[i];
            const hasChords = /\{[^}]+\}/.test(line);
            if (hasChords) {
              const chords = (line.match(/\{([^}]+)\}/g) || []).map(t => t.replace(/[{}]/g, ''));
              // Respect chartType: if user chose notes-only we skip chords in preview
              let lyric = '';
              if (i + 1 < lines.length && !/\{[^}]+\}/.test(lines[i + 1])) {
                lyric = lines[i + 1];
                i++;
              }
              pairs.push({ chords: shouldShowChord(chartType) ? chords : [], lyric: shouldShowNotes(chartType) ? lyric : '' });
            } else {
              // Línea sin acordes: la mostramos como lyric-only
              pairs.push({ chords: [], lyric: shouldShowNotes(chartType) ? line : '' });
            }
          }

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(s.key); }}
              className={`section-card ${isActive ? 'active' : ''} ${layoutMode === 'scrolling' ? 'fullwidth' : ''}`}
              onClick={() => handleClick(s.key)}
              style={{ border: `1px solid ${isActive ? s.color : 'var(--border-color)'}`, backgroundColor: isActive ? s.color + '08' : 'transparent', borderRadius: '10px' }}
            >
              <div className="section-card-top">
                <div className="section-badge" style={{ backgroundColor: s.color, color: '#fff' }}>{s.key}</div>
                <div className="section-title">{s.label}</div>
              </div>
              <div className="section-snippet">
                {pairs.length === 0 && <span className="muted">(sin texto)</span>}
                {pairs.map((p, i2) => (
                  <div className="section-snippet-item" key={i2}>
                    {p.chords && p.chords.length > 0 && (
                      <div className="section-chords" style={{ color: s.color, fontWeight: 700 }}>{p.chords.join(' ')}</div>
                    )}
                    {p.lyric && (
                      <div className="section-lyric">{p.lyric}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* In the new layout we avoid Prev/Next buttons and show a responsive grid
          that fills the available viewport; users can scroll naturally if content
          overflows. */}
    </div>
  );
};

export default SectionsOverview;
