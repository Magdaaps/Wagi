import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function Measurements({ sessionData, onSessionCreated, onFinish, onCancel }) {
  const [sessionId, setSessionId] = useState(sessionData.sessionId);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(!sessionData.sessionId);

  const [boxNumber, setBoxNumber] = useState('');
  const [emptyKg, setEmptyKg] = useState('');
  const [fullKg, setFullKg] = useState('');
  const [pcs, setPcs] = useState('');

  const boxRef = useRef();
  const emptyRef = useRef();

  useEffect(() => {
    if (!sessionId) {
      api.createSession({
        operator_ids: sessionData.operators.map(o => o.id),
        category_id: sessionData.category.id,
        product_id: sessionData.product.id,
        batch_numbers: sessionData.batchNumbers
      }).then(res => {
        setSessionId(res.id);
        onSessionCreated(res.id);
        return api.updateSession(res.id, {
          date_weighing: new Date().toISOString().split('T')[0],
          start_time: new Date().toTimeString().substring(0, 5),
          status: 'in_progress'
        });
      }).then(() => setLoading(false));
    } else {
      api.getSession(sessionId).then(data => {
        setMeasurements(data.measurements || []);
        setLoading(false);
      });
    }
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!emptyKg || !fullKg || !pcs) return;
    api.addMeasurement(sessionId, {
      box_number: boxNumber || null,
      empty_box_weight_kg: parseFloat(emptyKg),
      full_box_weight_kg: parseFloat(fullKg),
      piece_count: parseInt(pcs, 10)
    }).then(newM => {
      setMeasurements([...measurements, newM]);
      setBoxNumber('');
      setEmptyKg('');
      setFullKg('');
      setPcs('');
      boxRef.current?.focus();
    });
  };

  const handleDeleteLast = () => {
    if (measurements.length === 0) return;
    const last = measurements[measurements.length - 1];
    if (window.confirm('Usunąć ostatni pomiar?')) {
      api.deleteMeasurement(sessionId, last.id).then(() => {
        setMeasurements(measurements.slice(0, -1));
      });
    }
  };

  const endSession = () => {
    if (measurements.length === 0) {
      if (!window.confirm('Brak pomiarów. Na pewno zakończyć?')) return;
    }
    api.updateSession(sessionId, {
      end_time: new Date().toTimeString().substring(0, 5),
      status: 'completed'
    }).then(() => onFinish());
  };

  const handleCancel = () => {
    if (sessionId) {
      api.deleteSession(sessionId).then(() => onCancel());
      return;
    }
    onCancel();
  };

  if (loading) return <div className="text-center mt-4">Uruchamianie sesji...</div>;

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <div className="tablet-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="tablet-step-title">5. Pomiary ({measurements.length})</h1>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--choc-white)', borderRadius: '8px', borderLeft: '5px solid var(--choc-med)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {sessionData.product?.imageUrl && (
            <img
              src={sessionData.product.imageUrl}
              alt={sessionData.product?.name || 'Zdjęcie produktu'}
              style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '8px' }}
            />
          )}
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--choc-dark)' }}>
              {sessionData.product?.name}
            </div>
            <div style={{ fontSize: '1rem', color: 'var(--choc-med)', marginTop: '0.25rem' }}>
              Waga wzorcowa: <strong>{sessionData.product?.declared_weight_g}g</strong> (±{sessionData.product?.tolerance_g}g)
            </div>
          </div>
        </div>

        <form onSubmit={handleAdd} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div className="form-group">
            <label className="form-label">Numer skrzynki</label>
            <input ref={boxRef} type="text" className="form-control" value={boxNumber} onChange={e => setBoxNumber(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Waga pustej skrzynki (kg)</label>
            <input ref={emptyRef} type="number" step="0.001" className="form-control" value={emptyKg} onChange={e => setEmptyKg(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Waga pełnej skrzynki (kg)</label>
            <input type="number" step="0.001" className="form-control" value={fullKg} onChange={e => setFullKg(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Ilość sztuk</label>
            <input type="number" className="form-control" value={pcs} onChange={e => setPcs(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.5rem', padding: '1rem' }}>
            Zapisz pomiar
          </button>
        </form>
      </div>

      <div style={{ width: '500px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--choc-dark)' }}>Ostatnie wpisy</h2>
        <div style={{ background: 'white', borderRadius: '12px', flex: 1, overflowY: 'auto', padding: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {measurements.length === 0 ? <div className="text-muted">Brak pomiarów</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nr</th>
                  <th>Skrzynka</th>
                  <th>Produkt (kg)</th>
                  <th>Szt.</th>
                  <th>1 szt (g)</th>
                  <th>Godzina</th>
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().slice(0, 10).map((m, i) => (
                  <tr key={m.id}>
                    <td>{measurements.length - i}</td>
                    <td>{m.box_number || '-'}</td>
                    <td>{m.product_weight_kg.toFixed(3)}</td>
                    <td>{m.piece_count}</td>
                    <td style={{ fontWeight: 'bold', color: parseFloat(m.diff_g) > parseFloat(sessionData.product.tolerance_g) ? 'orange' : parseFloat(m.diff_g) < -parseFloat(sessionData.product.tolerance_g) ? 'red' : 'green' }}>
                      {m.avg_piece_weight_g.toFixed(1)}
                    </td>
                    <td>{m.created_at ? new Date(m.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {measurements.length > 0 && (
            <button className="btn btn-outline mt-3" onClick={handleDeleteLast} style={{ width: '100%' }}>
              Usuń ostatni wpis
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'space-between' }}>
          <button className="btn btn-outline" onClick={handleCancel}>Anuluj</button>
          <button className="btn btn-danger" onClick={endSession}>Zakończ ważenie</button>
        </div>
      </div>
    </div>
  );
}
