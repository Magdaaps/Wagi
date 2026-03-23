import React from 'react';

export default function Filters({ filters, onChange, categories, products, operators }) {
  const handleChange = (k, v) => onChange({ ...filters, [k]: v });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div>
        <label className="form-label" style={{ fontSize: '0.9rem' }}>Od</label>
        <input type="date" className="form-control" style={{ padding: '0.5rem' }} value={filters.date_from || ''} onChange={e => handleChange('date_from', e.target.value)} />
      </div>
      <div>
        <label className="form-label" style={{ fontSize: '0.9rem' }}>Do</label>
        <input type="date" className="form-control" style={{ padding: '0.5rem' }} value={filters.date_to || ''} onChange={e => handleChange('date_to', e.target.value)} />
      </div>
      <div>
        <label className="form-label" style={{ fontSize: '0.9rem' }}>Kategoria</label>
        <select className="form-control" style={{ padding: '0.5rem' }} value={filters.category_id || ''} onChange={e => handleChange('category_id', e.target.value)}>
          <option value="">Wszystkie</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label" style={{ fontSize: '0.9rem' }}>Produkt</label>
        <select className="form-control" style={{ padding: '0.5rem' }} value={filters.product_id || ''} onChange={e => handleChange('product_id', e.target.value)}>
          <option value="">Wszystkie</option>
          {products.filter(p => !filters.category_id || p.category_id === +filters.category_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label" style={{ fontSize: '0.9rem' }}>Operator</label>
        <select className="form-control" style={{ padding: '0.5rem' }} value={filters.operator_id || ''} onChange={e => handleChange('operator_id', e.target.value)}>
          <option value="">Wszyscy</option>
          {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label" style={{ fontSize: '0.9rem' }}>Nr partii</label>
        <input type="text" className="form-control" style={{ padding: '0.5rem' }} placeholder="Szukaj..." value={filters.batch_text || ''} onChange={e => handleChange('batch_text', e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button className="btn btn-outline" style={{ width: '100%', padding: '0.5rem' }} onClick={() => onChange({})}>Wyczyść filtry</button>
      </div>
    </div>
  );
}
