import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function CategorySelect({ onSelect, onBack }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories().then(data => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center mt-4">Ładowanie kategorii...</div>;

  return (
    <div>
      <div className="tablet-header">
        <h1 className="tablet-step-title">2. Wybierz kategorię</h1>
        <button className="btn btn-outline" onClick={onBack}>Wstecz</button>
      </div>
      <div className="grid-select">
        {categories.map(cat => (
          <div key={cat.id} className="grid-card" onClick={() => onSelect(cat)}>
            <div className="grid-card-title">{cat.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
