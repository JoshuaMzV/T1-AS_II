import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';

const STORAGE_KEY = 'mis-setlists';

function readCharts() {
  try {
    const raw = localStorage.getItem('mis-charts');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function readSetlists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const Setlists = () => {
  const [charts, setCharts] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [modalSetlist, setModalSetlist] = useState(null);

  // Builder state
  const [selectedIds, setSelectedIds] = useState([]);
  const [builderName, setBuilderName] = useState('');
  const [builderDate, setBuilderDate] = useState(() => new Date().toISOString().slice(0,10));
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setCharts(readCharts());
    setSetlists(readSetlists());
  }, []);

  useEffect(() => {
    // persist setlists when changed
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setlists));
  }, [setlists]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const moveSelected = (index, dir) => {
    // move the item at index in selectedIds by dir (-1 up, +1 down)
    setSelectedIds(prev => {
      const arr = [...prev];
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      const tmp = arr[newIndex]; arr[newIndex] = arr[index]; arr[index] = tmp;
      return arr;
    });
  };

  const saveSetlist = () => {
    if (!builderName.trim()) { alert('Introduce un nombre para la setlist'); return; }
    if (selectedIds.length === 0) { alert('Selecciona al menos una canción'); return; }
    const payload = {
      id: editingId || Date.now(),
      nombre: builderName.trim(),
      fecha: builderDate,
      canciones: selectedIds,
      createdAt: editingId ? undefined : new Date().toISOString()
    };

    // compute next list and persist immediately so it survives reload
    setSetlists(prev => {
      let next;
      if (editingId) {
        next = prev.map(s => s.id === editingId ? { ...s, ...payload } : s);
      } else {
        next = [payload, ...prev];
      }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (err) { console.warn('Failed to persist setlists', err); };
      return next;
    });

    // reset builder
    setBuilderName('');
    setBuilderDate(new Date().toISOString().slice(0,10));
    setSelectedIds([]);
    setEditingId(null);
  };

  const editSetlist = (id) => {
    const s = setlists.find(x => x.id === id);
    if (!s) return;
    setEditingId(id);
    setBuilderName(s.nombre);
    setBuilderDate(s.fecha || new Date().toISOString().slice(0,10));
    setSelectedIds(s.canciones || []);
  };

  const deleteSetlist = (id) => {
    if (!confirm('Eliminar setlist?')) return;
    setSetlists(prev => {
      const next = prev.filter(s => s.id !== id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (err) { console.warn('Failed to persist setlists', err); }
      return next;
    });
  };

  const viewSetlist = (s) => {
    setModalSetlist(s);
    setViewModalOpen(true);
  };

  return (
    <div style={{ padding: 12 }}>
      <h2>Setlists</h2>

      <section style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px', minWidth: 260 }}>
          <h3>Seleccionar canciones</h3>
          <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, background: 'var(--card-bg)' }}>
            {charts.length === 0 && <div className="muted">No hay canciones guardadas.</div>}
            {charts.map(ch => (
              <label key={ch.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 4px' }}>
                <input type="checkbox" checked={selectedIds.includes(ch.id)} onChange={() => toggleSelect(ch.id)} />
                <div style={{ flex: 1 }}>{ch.titulo} <div style={{ fontSize: 12, opacity: .7 }}>{ch.artista}</div></div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 260 }}>
          <h3>Ordenar seleccionadas</h3>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, background: 'var(--card-bg)' }}>
            {selectedIds.length === 0 && <div className="muted">No hay canciones seleccionadas.</div>}
            {selectedIds.map((id, idx) => {
              const ch = charts.find(c => c.id === id);
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }}>
                  <div style={{ flex: 1 }}>{ch ? ch.titulo : '(eliminado)'}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => moveSelected(idx, -1)} disabled={idx === 0}>↑</button>
                    <button onClick={() => moveSelected(idx, +1)} disabled={idx === selectedIds.length - 1}>↓</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <h3>Guardar setlist</h3>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: 'var(--card-bg)' }}>
            <label>Nombre</label>
            <input value={builderName} onChange={e => setBuilderName(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
            <label>Fecha</label>
            <input type="date" value={builderDate} onChange={e => setBuilderDate(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="boton-guardar" onClick={saveSetlist}>{editingId ? 'Actualizar' : 'Guardar'}</button>
              <button className="boton-cancelar" onClick={() => { setBuilderName(''); setBuilderDate(new Date().toISOString().slice(0,10)); setSelectedIds([]); setEditingId(null); }}>Reset</button>
            </div>
          </div>
        </div>
      </section>

      <hr style={{ margin: '18px 0' }} />

      <section>
        <h3>Setlists guardadas</h3>
        {setlists.length === 0 && <div className="muted">No hay setlists guardadas.</div>}
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {setlists.map(s => (
            <div key={s.id} style={{ border: '1px solid var(--border-color)', padding: 10, borderRadius: 8, background: 'var(--card-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{s.nombre}</div>
                <div style={{ fontSize: 13, opacity: .8 }}>{s.fecha} · {s.canciones ? s.canciones.length : 0} canciones</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => viewSetlist(s)}>Ver</button>
                <button onClick={() => editSetlist(s.id)}>Editar</button>
                <button onClick={() => deleteSetlist(s.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal: mostrar canciones de la setlist con estilo tipo Library */}
      <Modal isOpen={viewModalOpen} onRequestClose={() => setViewModalOpen(false)} className="modal" overlayClassName="overlay">
        <h2>{modalSetlist ? modalSetlist.nombre : ''} <small style={{ fontSize: 12, marginLeft: 8 }}>{modalSetlist ? modalSetlist.fecha : ''}</small></h2>
        <div style={{ maxHeight: '60vh', overflow: 'auto', paddingRight: 8 }}>
          {(modalSetlist && modalSetlist.canciones && modalSetlist.canciones.length > 0) ? (
            modalSetlist.canciones.map(id => {
              const c = charts.find(ch => ch.id === id);
              return (
                <div key={id} className="chart-item" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{c ? c.titulo : '(eliminado)'}</h3>
                      <p style={{ margin: 0 }}>{c ? c.artista : ''}</p>
                    </div>
                    {/* could add actions here (open, remove) later */}
                  </div>
                </div>
              );
            })
          ) : <div className="muted">(No hay canciones)</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="boton-cancelar" onClick={() => setViewModalOpen(false)}>Cerrar</button>
        </div>
      </Modal>
    </div>
  );
};

export default Setlists;
