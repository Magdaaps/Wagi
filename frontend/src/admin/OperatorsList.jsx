import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function OperatorsList() {
  const [operators, setOperators] = useState([]);
  const [search, setSearch] = useState('');
  const [newOperatorName, setNewOperatorName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = () => {
    api.getOperators().then(setOperators);
  };

  const handleAddOperator = () => {
    if (!newOperatorName.trim()) {
      alert('Imię i nazwisko jest wymagane!');
      return;
    }
    api.createOperator(newOperatorName).then(() => {
      setIsAdding(false);
      setNewOperatorName('');
      loadOperators();
    }).catch(err => {
      alert('Błąd dodawania pracownika: ' + err.message);
    });
  };

  const handleDeleteOperator = (operator) => {
    if (window.confirm(`Czy na pewno chcesz usunąć pracownika: ${operator.name}?`)) {
      api.deleteOperator(operator.id).then(() => {
        loadOperators();
      }).catch(err => {
        alert('Błąd usuwania: ' + err.message);
      });
    }
  };

  const filteredOperators = operators.filter(op =>
    !search.trim() || op.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="admin-header">
        <h1>Lista Pracowników</h1>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          + Dodaj pracownika
        </button>
      </div>

      <div className="admin-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Szukaj pracownika..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 400 }}
          />
          <span style={{ color: '#888', fontSize: '0.9rem' }}>({filteredOperators.length} z {operators.length})</span>
        </div>

        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', width: '60px' }}>ID</th>
              <th style={{ padding: '0.75rem' }}>Imię i nazwisko</th>
              <th style={{ padding: '0.75rem', width: '80px', textAlign: 'center' }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredOperators.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  Brak pracowników w bazie.
                </td>
              </tr>
            ) : (
              filteredOperators.map(op => (
                <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{op.id}</td>
                  <td style={{ padding: '0.75rem' }}>{op.name}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span
                      onClick={() => handleDeleteOperator(op)}
                      title="Usuń pracownika"
                      style={{ cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.2s', color: '#d9534f' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                    >🗑️</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '12px', 
            width: '400px', maxWidth: '95%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--choc-dark, #3a2a18)' }}>
              Dodaj pracownika
            </h3>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 'bold' }}>Imię i nazwisko <span style={{color: 'red'}}>*</span></label>
              <input 
                type="text" 
                className="form-control" 
                value={newOperatorName} 
                onChange={e => setNewOperatorName(e.target.value)} 
                placeholder="np. Jan Kowalski"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddOperator()}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setIsAdding(false)}>Anuluj</button>
              <button className="btn btn-primary" onClick={handleAddOperator}>Dodaj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
