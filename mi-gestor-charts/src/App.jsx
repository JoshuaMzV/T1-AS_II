import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
import ChartRenderer from './ChartRenderer';
import Navbar from './Navbar';
import Library from './Library';
import Setlists from './Setlists';
import SectionsOverview from './SectionsOverview';

// --- Importaciones para PDF ---
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import Modal from 'react-modal';
import { transposeAmount } from './musicUtils';
// --- NUEVO: Re-integramos las importaciones para leer PDF ---
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
// Usamos el worker desde CDN para evitar configuraciones de bundler
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs`;

Modal.setAppElement('#root');

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activeView, setActiveView] = useState('library');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  const [charts, setCharts] = useState(() => {
    const chartsGuardados = localStorage.getItem('mis-charts');
    return chartsGuardados ? JSON.parse(chartsGuardados) : [];
  });

  const [chartActivo, setChartActivo] = useState(null);
  // --- NUEVO: Estado para la transposición ---
  const [transposeOffset, setTransposeOffset] = useState(0);
  const [layoutMode, setLayoutMode] = useState('paging'); // 'paging' | 'scrolling'
  const [chartType, setChartType] = useState('both'); // 'notes' | 'chords' | 'both'
  const [chartViewMode, setChartViewMode] = useState('overview'); // 'overview' | 'edit'
  const [showMenu, setShowMenu] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      const el = document.querySelector('.more-menu');
      if (!el) return;
      if (!el.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    artista: '',
    tono: '',
    bpm: ''
  });

  // Estado para modal de importación (editar metadatos antes de crear)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    titulo: 'Chart Importado de PDF',
    artista: 'Desconocido',
    tono: '?',
    bpm: '?',
    cuerpo: ''
  });

  // --- NUEVO: Importación de PDF ---
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('mis-charts', JSON.stringify(charts));
  }, [charts]);

  // --- NUEVO: El cerebro de la importación de PDF ---
  const handleFileImport = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    setIsImporting(true);
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // AGRUPAR POR COORDENADA Y (aproximada) para reconstruir líneas
        const linesByY = {};
        for (const item of textContent.items) {
          // `transform[5]` suele contener la coordenada Y; la redondeamos para agrupar fragmentos
          const y = Math.round(item.transform[5]);
          if (!linesByY[y]) linesByY[y] = [];
          linesByY[y].push(item);
        }

        // Ordenamos las Y de mayor a menor (arriba -> abajo). Dependiendo de la versión de pdf.js
        // puede ser necesario invertir el orden, pero en la práctica esto funciona para la mayoría
        const yCoords = Object.keys(linesByY).map(Number).sort((a, b) => b - a);

        for (const y of yCoords) {
          const items = linesByY[y].sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0));
          const lineText = items.map(it => it.str).join(' ');
          fullText += lineText + '\n';
        }
        // Añadimos una separación entre páginas
        fullText += '\n';
      }

      parseAndConfirmChart(fullText);
    } catch (error) {
      console.error('Error al procesar el PDF:', error);
      alert('No se pudo leer el archivo PDF. Puede que esté dañado o sea una imagen.');
    } finally {
      setIsImporting(false);
      // Reset input
      if (event.target) event.target.value = '';
    }
  };

  const parseAndConfirmChart = (text) => {
    // Regex que busca líneas que contienen solo acordes y espacios (incluye slash-chords y extensiones comunes)
    const chordLineRegex = /^(?:\s*[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|sus2|sus4|°|\+)?[0-9]*(?:\/[A-G](?:#|b)?)?\s*)+$/i;
    const lines = text.split('\n');
    let detectedBody = '';

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      let currentLine = rawLine.trim();

      if (!currentLine) continue; // saltar líneas vacías

      // Si la línea empieza con '->' tomamos lo que sigue como la línea de acordes/entrada
      let arrowMode = false;
      if (/^->\s*/.test(currentLine)) {
        arrowMode = true;
        currentLine = currentLine.replace(/^->\s*/, '').trim();
      }

      // Si la línea es de acordes (o la marcamos con '->')
      if (chordLineRegex.test(currentLine) || arrowMode) {
        const nextLine = (lines[i + 1] || '').trim();

        // Formateamos la línea de acordes: cada token entre llaves
        const tokens = currentLine.split(/\s+/).filter(t => t);
        const formattedChords = tokens.map(chord => `{${chord}}`).join('');

        if (nextLine && !chordLineRegex.test(nextLine) && !/^->\s*/.test(nextLine)) {
          // Caso típico: línea de acordes seguida de letra
          detectedBody += formattedChords + '\n';
          detectedBody += nextLine + '\n\n';
          i++; // saltamos la línea de letra que ya procesamos
        } else {
          // Línea de acordes sola (instrumental, intro, etc.)
          detectedBody += formattedChords + '\n\n';
        }
      }
      // Si la línea ya viene como [Título] la conservamos
      else if (/^\[.*\]$/.test(currentLine)) {
        detectedBody += currentLine + '\n';
      }
      // --- Cambio principal: si no es acordes ni [Título], lo tratamos como un encabezado/etiqueta
      else {
        // Convertimos líneas como "Segunda Estrofa" o "Coro" a [Segunda Estrofa]
        detectedBody += `[${currentLine}]\n`;
      }
    }

    if (detectedBody) {
      // Abrimos un modal donde el usuario puede editar título/artista/tono/bpm
      setImportForm({
        titulo: 'Chart Importado de PDF',
        artista: 'Desconocido',
        tono: '?',
        bpm: '?',
        cuerpo: detectedBody
      });
      setImportModalOpen(true);
    } else {
      alert('No se pudo detectar un formato de cifrado válido en el PDF.');
    }
  };

  const handleImportFormChange = (e) => {
    const { name, value } = e.target;
    setImportForm(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmImport = () => {
    const newChart = {
      id: Date.now(),
      titulo: importForm.titulo || 'Chart Importado de PDF',
      artista: importForm.artista || 'Desconocido',
      tono: importForm.tono || '?',
      bpm: importForm.bpm || '?',
      cuerpo: importForm.cuerpo || ''
    };
    setCharts(prev => [newChart, ...prev]);
    setChartActivo(newChart);
    setTransposeOffset(0);
    setImportModalOpen(false);
    alert('¡Chart importado con éxito! Revisa y edita en el editor.');
  };

  // Maneja edición en tiempo real del cuerpo del chart
  const handleBodyChange = (e) => {
    const nuevoCuerpo = e.target.value;

    // Actualizamos el chart activo
    setChartActivo(prev => prev ? { ...prev, cuerpo: nuevoCuerpo } : prev);

    // Actualizamos la lista principal de charts
    setCharts(prevCharts => {
      return prevCharts.map(chart => 
        chartActivo && chart.id === chartActivo.id
          ? { ...chart, cuerpo: nuevoCuerpo }
          : chart
      );
    });
  };

  const handleNuevoChart = () => {
    setFormData({ titulo: '', artista: '', tono: '', bpm: '' });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardarChart = (e) => {
    e.preventDefault();
    const nuevo = {
      id: Date.now(),
      titulo: formData.titulo || 'Nuevo Chart',
      artista: formData.artista || 'Desconocido',
      tono: formData.tono || 'C',
      bpm: formData.bpm || 'N/A',
      cuerpo: '[Intro]\n...\n[Verse]\n...\n'
    };
    setCharts(prev => [nuevo, ...prev]);
    setChartActivo(nuevo);
    setIsModalOpen(false);
  };

  const handleEliminarChart = (idAEliminar) => {
    const chartsActualizados = charts.filter((chart) => chart.id !== idAEliminar);
    setCharts(chartsActualizados);
    if (chartActivo && chartActivo.id === idAEliminar) {
      setChartActivo(null);
    }
  };

  const handleExportarPDF = () => {
    const input = document.getElementById('chart-a-exportar');
    if (!input) {
      console.error("El elemento para exportar no fue encontrado");
      return;
    }
    html2canvas(input)
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${chartActivo ? chartActivo.titulo : 'chart'}.pdf`);
      });
  };

  return (
    <div className="app-layout">
      <Navbar activeView={activeView} setActiveView={setActiveView} theme={theme} toggleTheme={toggleTheme} />
      <main className="main-container">
        {activeView === 'library' && (
          // Si no hay chart seleccionado, mostramos la lista
          !chartActivo ? (
            <Library 
              charts={charts}
              onSelectChart={(c) => { setChartActivo(c); setTransposeOffset(0); setActiveView('library'); }}
              onNewChart={handleNuevoChart}
              onImportClick={() => fileInputRef.current && fileInputRef.current.click()}
              isImporting={isImporting}
              onDeleteChart={handleEliminarChart}
            />
          ) : (
            // Si hay chart seleccionado, mostramos la vista primaria (overview) o editor según mode
            <div className="chart-primary">
              <div className="chart-primary-header">
                <h3>{chartActivo.titulo}</h3>
                  <div className="chart-primary-actions">
                  <button className={`small-toggle ${chartViewMode === 'overview' ? 'active' : ''}`} onClick={() => setChartViewMode('overview')}>Overview</button>
                  <button className={`small-toggle ${chartViewMode === 'edit' ? 'active' : ''}`} onClick={() => setChartViewMode('edit')}>Editar</button>
                  <button className="boton-exportar" onClick={handleExportarPDF}>Exportar a PDF</button>

                  {/* Three-dots menu */}
                  <div className="more-menu">
                    <button onClick={() => setShowMenu(s => !s)}>⋯</button>
                    {showMenu && (
                      <div className="menu-panel">
                        <div className="menu-row">
                          <label>LAYOUT</label>
                          <select value={layoutMode} onChange={(e) => { setLayoutMode(e.target.value); setShowMenu(false); }}>
                            <option value="paging">Paging</option>
                            <option value="scrolling">Scrolling</option>
                          </select>
                        </div>
                        <div className="menu-row">
                          <label>Chart type</label>
                          <select value={chartType} onChange={(e) => { setChartType(e.target.value); setShowMenu(false); }}>
                            <option value="both">Both (title + chords + notes)</option>
                            <option value="chords">Chords only</option>
                            <option value="notes">Notes only</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {chartViewMode === 'overview' ? (
                <SectionsOverview chart={chartActivo} onSelectSection={(k) => console.log('Sección seleccionada', k)} layoutMode={layoutMode} chartType={chartType} />
              ) : (
                <div className="vista-chart-dividida">
                  <div className="editor-container">
                    <h3>Editor</h3>
                    <textarea 
                      className="editor-textarea"
                      value={chartActivo.cuerpo}
                      onChange={handleBodyChange}
                    />
                  </div>
                  <div className="preview-container">
                    <div className="preview-header">
                      <h3>Previsualización</h3>
                      <div className="transpose-controls">
                        <span>Tonalidad:</span>
                        <div className="note-buttons">
                          {['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map(n => (
                            <button className="note-button" key={n} onClick={() => {
                              let from = chartActivo && chartActivo.tono ? chartActivo.tono : null;
                              if (!from && chartActivo && chartActivo.cuerpo) {
                                const m = chartActivo.cuerpo.match(/\{([^}]+)\}/);
                                if (m) from = m[1].trim();
                              }
                              if (!from) from = 'C';
                              const amount = transposeAmount(from, n);
                              setTransposeOffset(amount);
                            }}>{n}</button>
                          ))}
                          <button className="boton-reset-tonalidad" onClick={() => setTransposeOffset(0)}>Reset</button>
                        </div>
                        <span className="transpose-indicator">{transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}</span>
                      </div>
                    </div>
                    <div id="chart-a-exportar">
                      <h2>{chartActivo.titulo}</h2>
                      <h4>Artista: {chartActivo.artista} | Tono: {chartActivo.tono} | BPM: {chartActivo.bpm}</h4>
                      <SectionsOverview chart={chartActivo} onSelectSection={(k) => console.log('Sección seleccionada', k)} layoutMode={layoutMode} chartType={chartType} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {activeView === 'setlists' && (
          <Setlists />
        )}
      </main>

      <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept="application/pdf" />

      {/* Modal para editar metadatos antes de importar el chart detectado */}
      <Modal isOpen={importModalOpen} onRequestClose={() => setImportModalOpen(false)} className="modal" overlayClassName="overlay">
        <h2>Editar metadatos antes de importar</h2>
        <div className="import-preview">
          <label>Título</label>
          <input type="text" name="titulo" value={importForm.titulo} onChange={handleImportFormChange} />

          <label>Artista</label>
          <input type="text" name="artista" value={importForm.artista} onChange={handleImportFormChange} />

          <label>Tono</label>
          <input type="text" name="tono" value={importForm.tono} onChange={handleImportFormChange} />

          <label>BPM</label>
          <input type="text" name="bpm" value={importForm.bpm} onChange={handleImportFormChange} />

          <label>Preview del Cuerpo (no editable)</label>
          <pre style={{ maxHeight: '250px', overflow: 'auto', background: '#fafafa', padding: 10 }}>{importForm.cuerpo}</pre>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button className="boton-cancelar" onClick={() => setImportModalOpen(false)}>Cancelar</button>
            <button className="boton-guardar" onClick={handleConfirmImport}>Importar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} className="modal" overlayClassName="overlay">
        <h2>Nuevo Chart</h2>
        <form onSubmit={handleGuardarChart}>
          <label>Nombre de la Canción</label>
          <input type="text" name="titulo" value={formData.titulo} onChange={handleFormChange} required />

          <label>Artista</label>
          <input type="text" name="artista" value={formData.artista} onChange={handleFormChange} />

          <label>Tono</label>
          <input type="text" name="tono" value={formData.tono} onChange={handleFormChange} />
          
          <label>BPM</label>
          <input type="number" name="bpm" value={formData.bpm} onChange={handleFormChange} />
          
          <div className="modal-acciones">
            <button type="button" onClick={() => setIsModalOpen(false)} className="boton-cancelar">Cancelar</button>
            <button type="submit" className="boton-guardar">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;