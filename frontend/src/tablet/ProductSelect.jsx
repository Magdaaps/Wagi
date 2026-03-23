import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ProductSelect({ categoryId, onSelect, onBack }) {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts(categoryId).then(data => {
      setProducts(data);
      setFiltered(data);
      setLoading(false);
    });
  }, [categoryId]);

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearch(v);
    setFiltered(products.filter(p => p.name.toLowerCase().includes(v.toLowerCase())));
  };

  if (loading) return <div className="text-center mt-4">Ładowanie produktów...</div>;

  return (
    <div>
      <div className="tablet-header">
        <h1 className="tablet-step-title">3. Wybierz produkt</h1>
        <button className="btn btn-outline" onClick={onBack}>Wstecz</button>
      </div>
      <div className="mb-4">
        <input 
          type="text" 
          className="form-control" 
          placeholder="Wyszukaj produkt..." 
          value={search}
          onChange={handleSearch}
        />
      </div>
      <div className="grid-select">
        {filtered.map(p => (
          <div key={p.id} className="grid-card" onClick={() => onSelect(p)} style={{ height: 'auto', minHeight: '220px', padding: '1rem' }}>
            <div style={{ width: '100%', height: '120px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ color: '#ccc', fontSize: '0.8rem', border: '1px dashed #ccc', width: '80%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                  Brak zdjęcia
                </div>
              )}
            </div>
            <div className="grid-card-title" style={{ fontSize: '1.2rem', lineHeight: '1.2' }}>{p.name}</div>
            <div className="mt-2 text-muted" style={{ fontSize: '1rem' }}>{p.declared_weight_g}g (±{p.tolerance_g}g)</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center w-100">Brak wyników</div>}
      </div>
    </div>
  );
}
