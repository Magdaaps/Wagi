import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function OperatorSelect({ onSelect }) {
  const [operators, setOperators] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOperators().then(data => {
      setOperators(data);
      setFiltered(data);
      setLoading(false);
    });
  }, []);

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearch(v);
    setFiltered(operators.filter(op => op.name.toLowerCase().includes(v.toLowerCase())));
  };

  if (loading) return <div className="text-center mt-4">Ładowanie pracowników...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div className="tablet-header">
        <h1 className="tablet-step-title">1. Wybierz pracownika</h1>
      </div>
      
      <div className="mb-4">
        <input 
          type="text" 
          className="form-control" 
          placeholder="Wyszukaj po imieniu i nazwisku..." 
          value={search}
          onChange={handleSearch}
          autoFocus
          style={{ height: '60px', fontSize: '1.4rem' }}
        />
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: 'var(--radius)', 
        boxShadow: 'var(--shadow)',
        maxHeight: '60vh',
        overflowY: 'auto',
        border: '1px solid #ddd'
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            Nie znaleziono pracownika.
          </div>
        ) : (
          filtered.map(op => (
            <div 
              key={op.id} 
              onClick={() => onSelect(op)}
              style={{
                padding: '1.5rem 2rem',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                fontSize: '1.4rem',
                fontWeight: '600',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fdf5e6'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--choc-med)', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '1.5rem',
                fontSize: '1rem'
              }}>
                {op.name.charAt(0).toUpperCase()}
              </div>
              {op.name}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
