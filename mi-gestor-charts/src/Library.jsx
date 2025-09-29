import React from 'react';

const Library = ({ charts, onSelectChart, onNewChart, onImportClick, isImporting, onDeleteChart }) => {
  return (
    <div className="library-container">
      <div className="library-hero">
        <div className="hero-left">
          <h1>Library</h1>
          <p className="hero-sub">Tus canciones y charts — importa un PDF o crea uno nuevo para empezar.</p>
          <div className="hero-actions">
            <button onClick={onNewChart} className="boton-nuevo large">+ Nuevo Chart</button>
            <button onClick={onImportClick} className="boton-importar large" disabled={isImporting}>
              {isImporting ? 'Importando...' : 'Importar PDF'}
            </button>
          </div>
        </div>
        <div className="hero-right">
          <div className="quick-list">
            <h4>Tus charts</h4>
            {charts.length === 0 && <div className="no-charts-inline">Aún no tienes charts. Importa o crea uno.</div>}
            {charts.slice(0,6).map(chart => (
              <div key={chart.id} className="chart-item-inline" onClick={() => onSelectChart(chart)}>
                <div className="chart-item-info">
                  <strong>{chart.titulo}</strong>
                  <div className="muted">{chart.artista}</div>
                </div>
                {onDeleteChart && (
                  <button className="boton-eliminar small" aria-label={`Eliminar ${chart.titulo}`} onClick={(e) => { e.stopPropagation(); onDeleteChart(chart.id); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-list full-list">
        {charts.length > 0 ? (
          charts.map(chart => (
            <div key={chart.id} className="chart-item" onClick={() => onSelectChart(chart)}>
              <h3>{chart.titulo}</h3>
              <p>{chart.artista}</p>
              {onDeleteChart && (
                <button className="boton-eliminar small" aria-label={`Eliminar ${chart.titulo}`} onClick={(e) => { e.stopPropagation(); onDeleteChart(chart.id); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))
        ) : null}
      </div>
    </div>
  );
};

export default Library;
