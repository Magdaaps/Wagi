import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Filters from './Filters';
import SessionDetail from './SessionDetail';

export default function SessionsList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const loadData = () => {
    setLoading(true);
    api.getSessions({ ...filters, status: 'completed' }).then(data => {
      setSessions(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    api.getCategories().then(setCategories);
    api.getProducts().then(setProducts);
    api.getOperators().then(setOperators);
  }, []);

  useEffect(() => { loadData(); }, [filters]);

  const selSession = sessions.find(s => s.id === selectedSessionId) || null;

  const handleDelete = (e, id) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę sesję?')) {
      api.deleteSession(id).then(() => {
        loadData();
      }).catch(err => alert(err.message));
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Sesje ważeń</h1>
      <Filters filters={filters} onChange={setFilters} categories={categories} products={products} operators={operators} />

      {loading ? <div className="text-center mt-4">Ładowanie sesji...</div> : (
        <table className="data-table" style={{ fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Data (Koniec)</th>
              <th>Czas</th>
              <th>Operator</th>
              <th>Kategoria / Produkt</th>
              <th>Ilość</th>
              <th>Śr. waga (g)</th>
              <th>Dekl. (g)</th>
              <th>Różn. (g)</th>
              <th>Różn. (%)</th>
              <th>Koszty / Zuż. (kg)</th>
              <th>Usuń</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan="12" className="text-center">Brak wyników</td></tr>
            ) : sessions.map(s => (
              <tr key={s.id} onClick={() => setSelectedSessionId(s.id)} style={{ cursor: 'pointer' }}>
                <td>#{s.id}</td>
                <td>{s.date_weighing} {s.end_time}</td>
                <td>{s.duration}</td>
                <td>{s.operator_name}</td>
                <td><strong>{s.category_name}</strong><br/>{s.product_name}</td>
                <td>{s.measurement_count} pomiarów</td>
                <td style={{ fontWeight: 'bold' }}>{s.avg_weight_g}</td>
                <td>{s.declared_weight_g}</td>
                <td style={{ color: s.diff_g > s.tolerance_g ? 'orange' : s.diff_g < -s.tolerance_g ? 'red' : 'inherit' }}>{s.diff_g > 0 ? '+' : ''}{s.diff_g}</td>
                <td>{s.diff_pct > 0 ? '+' : ''}{s.diff_pct}%</td>
                <td>{s.total_chocolate_kg} kg</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="btn-delete" 
                    onClick={(e) => handleDelete(e, s.id)}
                    style={{ 
                      background: '#ff4d4d', 
                      color: 'white', 
                      border: 'none', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedSessionId && selSession && (
        <SessionDetail session={selSession} onClose={() => setSelectedSessionId(null)} onUpdate={loadData} />
      )}
    </div>
  );
}
