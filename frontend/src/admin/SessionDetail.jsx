import React, { useState } from 'react';
import { api } from '../api';

export default function SessionDetail({ session, onClose, onUpdate }) {
  const [editingMid, setEditingMid] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (m) => {
    setEditingMid(m.id);
    setEditForm({ empty_box_weight_kg: m.empty_box_weight_kg, full_box_weight_kg: m.full_box_weight_kg, piece_count: m.piece_count });
  };

  const saveEdit = (mid) => {
    api.updateMeasurement(session.id, mid, editForm).then(() => {
      setEditingMid(null);
      onUpdate();
    });
  };

  const handleDelete = (mid) => {
    if (window.confirm('Usunąć ten pomiar?')) {
      api.deleteMeasurement(session.id, mid).then(() => onUpdate());
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
      <div style={{ background: 'white', width: '100%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2>Szczegóły sesji #{session.id}</h2>
          <button className="btn btn-outline" onClick={onClose}>Zamknij x</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h4 style={{ color: 'var(--choc-light)', marginBottom: '0.5rem' }}>Informacje ogólne</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody style={{ verticalAlign: 'top' }}>
                <tr><td style={{ padding: '0.2rem 0', width: '120px' }}>Operator:</td><th style={{ textAlign: 'left', padding: '0.2rem 0' }}>{session.operator_name}</th></tr>
                <tr><td style={{ padding: '0.2rem 0' }}>Kategoria:</td><th style={{ textAlign: 'left', padding: '0.2rem 0' }}>{session.category_name}</th></tr>
                <tr><td style={{ padding: '0.2rem 0' }}>Produkt:</td><th style={{ textAlign: 'left', padding: '0.2rem 0' }}>{session.product_name}</th></tr>
                <tr><td style={{ padding: '0.2rem 0' }}>Data:</td><th style={{ textAlign: 'left', padding: '0.2rem 0' }}>{session.date_weighing}</th></tr>
                <tr><td style={{ padding: '0.2rem 0' }}>Start/Koniec:</td><th style={{ textAlign: 'left', padding: '0.2rem 0' }}>{session.start_time} - {session.end_time}</th></tr>
                <tr><td style={{ padding: '0.2rem 0' }}>Czas trwania:</td><th style={{ textAlign: 'left', padding: '0.2rem 0' }}>{session.duration}</th></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={{ color: 'var(--choc-light)', marginBottom: '0.5rem' }}>Wyliczenia</h4>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr><td>Dekl. waga:</td><th>{session.declared_weight_g} g (±{session.tolerance_g}g)</th></tr>
                <tr><td>Ilość sztuk:</td><th>{session.total_piece_count} szt</th></tr>
                <tr><td>Śr. waga 1 szt:</td><th>{session.avg_weight_g} g</th></tr>
                <tr><td>Różnica:</td><th>{session.diff_g > 0 ? '+' : ''}{session.diff_g} g ({session.diff_pct > 0 ? '+' : ''}{session.diff_pct}%)</th></tr>
                <tr><td>Suma różnic:</td><th>{session.sum_diff_kg > 0 ? '+' : ''}{session.sum_diff_kg} kg</th></tr>
                <tr><td>Planowane zużycie surowca:</td><th>{session.planned_consumption_kg ?? (session.total_chocolate_kg - session.sum_diff_kg).toFixed(2)} kg</th></tr>
                <tr><td>Całkowite zużycie:</td><th>{session.total_chocolate_kg} kg</th></tr>
                {(() => {
                  const hasPatyczki = Object.keys(session.batch_numbers || {}).some(key => {
                    const r = session.recipe_items?.find(x => x.ingredient_type === key);
                    const label = r ? r.label : key;
                    return label.toLowerCase().includes('patyczki papierowe');
                  });
                  if (!hasPatyczki) return null;
                  const patyczkiKg = ((session.total_piece_count || 0) * 0.001).toFixed(3);
                  return <tr><td>Waga patyczków:</td><th>{patyczkiKg} kg</th></tr>;
                })()}
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={{ color: 'var(--choc-light)', marginBottom: '0.5rem' }}>Numery partii surowców</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {Object.entries(session.batch_numbers || {}).map(([key, val]) => {
                const r = session.recipe_items?.find(x => x.ingredient_type === key);
                const label = r ? r.label : key;
                const displayVal = typeof val === 'object'
                  ? `${val.batch} (${val.company})`
                  : val;
                return <li key={key} style={{ padding: '0.3rem 0', borderBottom: '1px solid #f0f0f0' }}><strong>{label}:</strong> {displayVal}</li>;
              })}
            </ul>
          </div>
        </div>

        <h3 style={{ marginBottom: '1rem' }}>Pomiary ({session.measurement_count})</h3>
        <table className="data-table" style={{ fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th>Nr</th>
              <th>Pusta skrzynka (kg)</th>
              <th>Pełna skrzynka (kg)</th>
              <th>Sztuk</th>
              <th>Waga prod. (kg)</th>
              <th>Śr. 1 szt (g)</th>
              <th>Różnica (g)</th>
               <th>Różnica (%)</th>
               <th>Godzina</th>
               <th style={{ width: '180px' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {session.measurements?.map(m => (
              <tr key={m.id}>
                <td>{m.seq}</td>
                {editingMid === m.id ? (
                  <>
                    <td><input type="number" step="0.001" style={{ width: '100%' }} value={editForm.empty_box_weight_kg} onChange={e => setEditForm({...editForm, empty_box_weight_kg: e.target.value})} /></td>
                    <td><input type="number" step="0.001" style={{ width: '100%' }} value={editForm.full_box_weight_kg} onChange={e => setEditForm({...editForm, full_box_weight_kg: e.target.value})} /></td>
                     <td><input type="number" style={{ width: '100%' }} value={editForm.piece_count} onChange={e => setEditForm({...editForm, piece_count: e.target.value})} /></td>
                     <td colSpan="5" className="text-muted">Po zapisie wyliczy ponownie</td>
                    <td>
                      <button className="btn btn-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => saveEdit(m.id)}>Zapisz</button>
                      <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setEditingMid(null)}>Anuluj</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{m.empty_box_weight_kg}</td>
                    <td>{m.full_box_weight_kg}</td>
                    <td>{m.piece_count}</td>
                    <td>{m.product_weight_kg}</td>
                    <td style={{ fontWeight: 'bold' }}>{m.avg_piece_weight_g}</td>
                    <td style={{ color: parseFloat(m.diff_g) > parseFloat(session.tolerance_g) ? 'orange' : parseFloat(m.diff_g) < -parseFloat(session.tolerance_g) ? 'red' : 'inherit' }}>{m.diff_g > 0 ? '+' : ''}{m.diff_g}</td>
                     <td>{m.diff_pct > 0 ? '+' : ''}{m.diff_pct}%</td>
                     <td>{m.created_at ? new Date(m.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                     <td>
                      <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.5rem' }} onClick={() => startEdit(m)}>Edytuj</button>
                      <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleDelete(m.id)}>Usuń</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
