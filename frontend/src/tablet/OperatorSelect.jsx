import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function OperatorSelect({ onSelect }) {
  const [operators, setOperators] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
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

  const toggleOperator = (operator) => {
    setSelected(prevSelected =>
      prevSelected.some(op => op.id === operator.id)
        ? prevSelected.filter(op => op.id !== operator.id)
        : [...prevSelected, operator]
    );
  };

  const removeSelected = (operatorId) => {
    setSelected(prevSelected => prevSelected.filter(op => op.id !== operatorId));
  };

  if (loading) return <div className="text-center mt-4">Ładowanie pracowników...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div className="tablet-header">
        <h1 className="tablet-step-title">1. Wybierz pracownika</h1>
      </div>

      {selected.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}
        >
          {selected.map(op => (
            <div
              key={op.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--choc-med)',
                color: 'white',
                borderRadius: '999px',
                padding: '0.5rem 0.9rem',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              <span>{op.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSelected(op.id);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: 0
                }}
                aria-label={`Usuń ${op.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

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

      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          maxHeight: '60vh',
          overflowY: 'auto',
          border: '1px solid #ddd'
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            Nie znaleziono pracownika.
          </div>
        ) : (
          filtered.map(op => {
            const isSelected = selected.some(selectedOp => selectedOp.id === op.id);

            return (
              <div
                key={op.id}
                onClick={() => toggleOperator(op)}
                style={{
                  padding: '1.5rem 2rem',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#fdf5e6' : 'white'
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#fdf5e6';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = isSelected ? '#fdf5e6' : 'white';
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? 'var(--accent-green, #4caf50)' : 'var(--choc-med)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1.5rem',
                    fontSize: '1rem'
                  }}
                >
                  {isSelected ? '✓' : op.name.charAt(0).toUpperCase()}
                </div>
                {op.name}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary w-100 mt-4"
        disabled={selected.length === 0}
        onClick={() => onSelect(selected)}
        style={{ height: '60px', fontSize: '1.3rem', fontWeight: '600' }}
      >
        {`Dalej (${selected.length})`}
      </button>
    </div>
  );
}
