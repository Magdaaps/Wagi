import React, { useEffect, useState } from 'react';
import { api } from '../api';

const CATEGORIES = ['Barwniki', 'Czekolady', 'Polewy', 'Owoce', 'Materiały', 'Dodatki', 'Firmy'];

export default function IngredientsList() {
  const [ingredients, setIngredients] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Dodatki');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setError(null);
    setLoading(true);
    api.getIngredientsAll()
      .then(data => {
        setIngredients(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Błąd ładowania surowców:', err);
        setError('Nie udało się załadować surowców. Upewnij się, że serwer został zrestartowany.');
        setLoading(false);
      });
  };

  const handleNameChange = (val) => {
    setNewName(val);
    const lower = val.toLowerCase();
    // Only auto-detect if we're in "Dodatki" or just let it be if user is in a category?
    // Actually, if they are INSIDE a category list, we should probably force that category.
    if (!selectedCategory) {
      if (lower.includes('barwnik')) setNewCategory('Barwniki');
      else if (lower.includes('czekolada')) setNewCategory('Czekolady');
      else if (lower.includes('polewa')) setNewCategory('Polewy');
      else if (lower.includes('patyczki') || lower.includes('tacka') || lower.includes('wypraska')) setNewCategory('Materiały');
      else if (lower.includes('liofilizowan') || lower.includes('porzeczka') || lower.includes('jabłko') || lower.includes('malina')) setNewCategory('Owoce');
      else if (lower.includes('firma')) setNewCategory('Firmy');
      else setNewCategory('Dodatki');
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const catToUse = selectedCategory || newCategory;
    
    api.addIngredient(newName.trim(), catToUse).then(() => {
      setNewName('');
      loadData();
    }).catch(err => {
      alert('Błąd podczas dodawania surowca: ' + err.message);
    });
  };

  const handleDelete = (label) => {
    if (window.confirm(`Czy na pewno chcesz usunąć surowiec: ${label}?`)) {
      api.deleteIngredient(label).then(() => {
        loadData();
      }).catch(err => {
        alert('Błąd podczas usuwania surowca: ' + err.message);
      });
    }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = ingredients.filter(i => i.category === cat);
    return acc;
  }, {});

  if (loading) return <div className="p-4">Ładowanie surowców...</div>;

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="admin-card" style={{ padding: '2rem', border: '1px solid #ffcccc', backgroundColor: '#fff5f5' }}>
          <h2 style={{ color: '#d9534f', marginBottom: '1rem' }}>Błąd ładowania</h2>
          <p style={{ marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={loadData}>Spróbuj ponownie</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Baza Surowców</h1>
          <p style={{ color: '#888', margin: 0 }}>
            {selectedCategory ? `Kategoria: ${selectedCategory}` : 'Wybierz kategorię surowców'}
          </p>
        </div>
        {selectedCategory && (
          <button className="btn btn-outline" onClick={() => setSelectedCategory(null)}>
            ← Wstecz do kategorii
          </button>
        )}
      </div>

      {!selectedCategory ? (
        /* Grid of categories */
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '1.5rem',
          marginTop: '1rem'
        }}>
          {CATEGORIES.map(cat => (
            <div 
              key={cat} 
              className="admin-card" 
              onClick={() => setSelectedCategory(cat)}
              style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '180px',
                border: '2px solid transparent'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'var(--choc-light)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--choc-dark)' }}>{cat}</h2>
              <div style={{ 
                backgroundColor: 'var(--choc-white)', 
                color: 'var(--choc-med)', 
                padding: '0.25rem 1rem', 
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                {grouped[cat].length} pozycji
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Specific category view */
        <div>
          <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--choc-white)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Dodaj nowy surowiec do grupy: {selectedCategory}</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder={`Np. nowy rodzaj ${selectedCategory.toLowerCase()}...`}
                value={newName}
                onChange={e => handleNameChange(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <button type="submit" className="btn btn-primary">+ Dodaj</button>
            </form>
          </div>

          <div className="admin-card" style={{ padding: '0.5rem' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '1rem', width: '60px' }}>Lp</th>
                  <th style={{ padding: '1rem' }}>Nazwa surowca</th>
                  <th style={{ padding: '1rem', width: '100px', textAlign: 'center' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {grouped[selectedCategory].map((ing, idx) => (
                  <tr key={ing.label} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '1rem', color: '#888' }}>{idx + 1}</td>
                    <td style={{ padding: '1rem', fontWeight: 500, fontSize: '1.1rem' }}>{ing.label}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDelete(ing.label)}
                        title="Usuń surowiec"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.5, color: '#d9534f' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {grouped[selectedCategory].length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '3rem', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                      Brak surowców w tej kategorii. Dodaj pierwszy powyżej.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
