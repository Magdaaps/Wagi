import React, { useState, useEffect } from 'react';
import { api } from '../api';

// Returns replacement options for a given chocolate/coating label
function getChocCoatingOptions(label) {
  const l = label.toLowerCase();
  if (l.includes('mleczn')) return ['Czekolada mleczna', 'Polewa mleczna'];
  if (l.includes('biał')) return ['Czekolada biała', 'Polewa biała'];
  if (l.includes('deserow') || l.includes('gorzk') || l.includes('ciemn')) {
    return ['Czekolada deserowa', 'Czekolada gorzka', 'Polewa ciemna'];
  }
  return [label];
}

const STICK_OPTIONS = [
  'Patyczki drewniane',
  'Patyczki papierowe 120mm',
  'Patyczki papierowe 80mm',
  'Patyczki plastikowe 120mm',
  'Patyczki plastikowe 135mm',
  'Patyczki plastikowe 80mm',
];

export default function BatchNumbers({ product, onSubmit, onBack }) {
  const [recipe, setRecipe] = useState([]);
  const [batches, setBatches] = useState({});
  const [companies, setCompanies] = useState([]);
  const [labelOverrides, setLabelOverrides] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product) return;

    // Fetch both product recipe and all ingredients to get companies
    Promise.all([
      api.getProduct(product.id),
      api.getIngredientsAll()
    ]).then(([productData, allIngredients]) => {
      setRecipe(productData.recipe_items || []);

      const firms = allIngredients.filter(i => i.category === 'Firmy');
      setCompanies(firms);

      const initBatches = {};
      (productData.recipe_items || []).forEach(r => {
        const isChocOrCoating = (r.label.toLowerCase().includes('czekolada') || r.label.toLowerCase().includes('polewa')) && !r.label.toLowerCase().includes('wypraska');
        if (isChocOrCoating) {
          initBatches[r.id] = { batch: '', company: '' };
        } else {
          initBatches[r.id] = '';
        }
      });
      setBatches(initBatches);
      setLoading(false);
    });
  }, [product]);
  
  const handleChange = (id, field, val) => {
    setBatches(prev => {
      if (typeof prev[id] === 'object') {
        return { ...prev, [id]: { ...prev[id], [field]: val } };
      }
      return { ...prev, [id]: val };
    });
  };

  const handleLabelChange = (itemId, newLabel) => {
    setLabelOverrides(prev => ({ ...prev, [itemId]: newLabel }));
  };

  const getEffectiveLabel = (item) => labelOverrides[item.id] ?? item.label;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedBatches = {};
    recipe.forEach(r => {
      formattedBatches[getEffectiveLabel(r)] = batches[r.id];
    });
    onSubmit(formattedBatches);
  };

  const isFormValid = recipe.every(r => {
    const val = batches[r.id];
    if (typeof val === 'object') {
      return val.batch.trim() !== '' && val.company.trim() !== '';
    }
    return val?.trim() !== '';
  });

  if (loading) return <div className="text-center mt-4">Ładowanie receptury...</div>;

  if (recipe.length === 0) {
    return (
      <div className="text-center">
        <h2>Brak surowców do podania partii.</h2>
        <button className="btn btn-primary mt-4" onClick={() => onSubmit({})}>Przejdź dalej</button>
      </div>
    );
  }

  return (
    <div>
      <div className="tablet-header">
        <h1 className="tablet-step-title">4. Podaj numery partii: {product?.name}</h1>
        <button className="btn btn-outline" onClick={onBack}>Wstecz</button>
      </div>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '12px' }}>
        {recipe.map((item, idx) => {
          const isChocOrCoating = typeof batches[item.id] === 'object';
          const isStick = item.label.toLowerCase().includes('patyczki');
          const effectiveLabel = getEffectiveLabel(item);
          const options = isChocOrCoating ? getChocCoatingOptions(item.label) : [];
          return (
            <div className="form-group" key={item.id} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>{idx + 1}. {effectiveLabel}</label>
                {isChocOrCoating && options.length > 1 && (
                  <select
                    value={effectiveLabel}
                    onChange={(e) => handleLabelChange(item.id, e.target.value)}
                    style={{ fontSize: '0.75rem', padding: '2px 6px', border: '1px solid #c8956b', borderRadius: '6px', color: '#c8956b', background: 'white', cursor: 'pointer' }}
                  >
                    {options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {isStick && (
                  <select
                    value={effectiveLabel}
                    onChange={(e) => handleLabelChange(item.id, e.target.value)}
                    style={{ fontSize: '0.75rem', padding: '2px 6px', border: '1px solid #c8956b', borderRadius: '6px', color: '#c8956b', background: 'white', cursor: 'pointer' }}
                  >
                    {STICK_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.8rem', color: '#666' }}>Numer partii:</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    value={isChocOrCoating ? batches[item.id].batch : batches[item.id]}
                    onChange={(e) => isChocOrCoating ? handleChange(item.id, 'batch', e.target.value) : handleChange(item.id, null, e.target.value)}
                    placeholder="Wpisz numer partii..."
                  />
                </div>
                
                {isChocOrCoating && (
                  <div style={{ flex: 3 }}>
                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Firma:</label>
                    <select 
                      className="form-control"
                      required
                      value={batches[item.id].company}
                      onChange={(e) => handleChange(item.id, 'company', e.target.value)}
                    >
                      <option value="">-- Wybierz firmę --</option>
                      {companies.map(c => (
                        <option key={c.label} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      
      <div className="mt-4 text-center">
        <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.2rem', padding: '1rem' }} disabled={!isFormValid}>
          Potwierdź numery partii
        </button>
      </div>
    </form>
  </div>
);
}
