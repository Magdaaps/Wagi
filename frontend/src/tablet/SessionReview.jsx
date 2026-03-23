import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function SessionReview({ sessionId, onComplete }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSession(sessionId).then(data => {
      setSession(data);
      setLoading(false);
    });
  }, [sessionId]);

  const handleSave = () => {
    // In this MVP, the session is already saved incrementally.
    // The "Zakończ ważenie" button locked the session status to 'completed'.
    // Here we just return to the start screen.
    alert('Sesja zapisana pomyślnie!');
    onComplete();
  };

  if (loading) return <div className="text-center mt-4">Ładowanie podsumowania...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <div className="tablet-header">
        <h1 className="tablet-step-title" style={{ color: 'var(--accent-green)' }}>6. Podsumowanie sesji</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Informacje</h3>
          <p><strong>Operator:</strong> {session.operator_name}</p>
          <p><strong>Kategoria:</strong> {session.category_name}</p>
          <p><strong>Produkt:</strong> {session.product_name}</p>
          <p><strong>Deklarowana waga:</strong> {session.declared_weight_g} g (±{session.tolerance_g} g)</p>
          <br />
          <p><strong>Start:</strong> {session.start_time}</p>
          <p><strong>Koniec:</strong> {session.end_time}</p>
        </div>
        <div>
          <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Wyniki</h3>
          <p><strong>Liczba pomiarów:</strong> {session.measurement_count}</p>
          <p><strong>Średnia waga 1 szt:</strong> {session.avg_weight_g} g</p>
          <p>
            <strong>Rozbieżność:</strong> 
            <span style={{ color: session.diff_g > session.tolerance_g ? 'orange' : session.diff_g < -session.tolerance_g ? 'red' : 'green', marginLeft: '0.5rem', fontWeight: 'bold' }}>
              {session.diff_g > 0 ? '+' : ''}{session.diff_g} g ({session.diff_pct > 0 ? '+' : ''}{session.diff_pct}%)
            </span>
          </p>
          <p><strong>Zużycie czekolady:</strong> {session.total_chocolate_kg} kg</p>
        </div>
      </div>

      <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Surowce</h3>
      <ul>
        {Object.entries(session.batch_numbers || {}).map(([key, val]) => {
          const r = session.recipe_items?.find(x => x.ingredient_type === key);
          const label = r ? r.label : key;
          const displayVal = typeof val === 'object' 
            ? `Partia: ${val.batch}, Firma: ${val.company}` 
            : val;
          return <li key={key}><strong>{label}:</strong> {displayVal}</li>;
        })}
      </ul>

      <div className="mt-4 text-center">
        <button className="btn btn-success" style={{ fontSize: '1.5rem', padding: '1rem 3rem' }} onClick={handleSave}>
          Zatwierdź i zamknij
        </button>
      </div>
    </div>
  );
}
