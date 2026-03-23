import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';

const BASE_URL = '/api';

async function uploadProductImage(productId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BASE_URL}/products/${productId}/image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [ingredientsMaster, setIngredientsMaster] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [editEan, setEditEan] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDeclaredWeight, setEditDeclaredWeight] = useState('');
  const [editIngredients, setEditIngredients] = useState([]);
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Add product state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', ean: '', declared_weight_g: '', category_id: '' });

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([api.getProducts(), api.getIngredients(), api.getCategories()])
      .then(([prods, ings, cats]) => {
        setProducts(prods);
        setIngredientsMaster(ings);
        setCategories(cats);
      });
  };

  const handleEditClick = (product) => {
    api.getProduct(product.id).then(fullProduct => {
      setEditingProduct(fullProduct);
      setEditEan(fullProduct.ean || '');
      setEditCategoryId(fullProduct.category_id || '');
      setEditDeclaredWeight(fullProduct.declared_weight_g || '');
      setEditIngredients(fullProduct.recipe_items.map(r => r.label));
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
  };

  const handleSave = () => {
    if (!editingProduct) return;
    
    api.updateProduct(editingProduct.id, {
      ean: editEan,
      category_id: editCategoryId ? +editCategoryId : null,
      declared_weight_g: editDeclaredWeight ? +editDeclaredWeight : null,
      recipe_items: editIngredients.map(label => ({ label }))
    }).then(() => {
      setEditingProduct(null);
      loadData();
    });
  };

  const handleCreateProduct = () => {
    if (!newProduct.name.trim()) {
      alert('Nazwa produktu jest wymagana!');
      return;
    }
    
    api.createProduct(newProduct).then(() => {
      setIsAddingProduct(false);
      setNewProduct({ name: '', ean: '', declared_weight_g: '', category_id: '' });
      loadData();
    }).catch(err => {
      alert('Błąd podczas dodawania produktu: ' + err.message);
    });
  };

  const handleDeleteClick = (product) => {
    if (window.confirm(`Czy na pewno chcesz usunąć produkt: ${product.name}?`)) {
      api.deleteProduct(product.id).then(() => {
        loadData();
      }).catch(err => {
        alert('Błąd podczas usuwania produktu: ' + err.message);
      });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingProduct) return;
    setUploading(true);
    try {
      const result = await uploadProductImage(editingProduct.id, file);
      setEditingProduct(prev => ({ ...prev, imageUrl: result.imageUrl }));
      loadData();
    } catch (err) {
      alert('Błąd podczas wgrywania zdjęcia.');
    } finally {
      setUploading(false);
    }
  };

  const addIngredient = () => {
    const val = newIngredientInput.trim();
    if (val && !editIngredients.includes(val)) {
      setEditIngredients([...editIngredients, val]);
      setNewIngredientInput('');
    }
  };

  const removeIngredient = (ingredient) => {
    setEditIngredients(editIngredients.filter(i => i !== ingredient));
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.ean && p.ean.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="admin-header">
        <h1>Lista Produktów</h1>
        <span style={{ color: '#888', fontSize: '0.9rem' }}>({filteredProducts.length} z {products.length})</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Szukaj po nazwie lub EAN..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
        <button className="btn btn-primary" onClick={() => setIsAddingProduct(true)}>
          + Dodaj produkt
        </button>
      </div>

      <div className="admin-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem', width: '40px' }}>Lp</th>
              <th style={{ padding: '0.5rem', width: '80px' }}>Zdjęcie</th>
              <th style={{ padding: '0.5rem', width: '130px' }}>EAN</th>
              <th style={{ padding: '0.5rem', width: '30%' }}>Nazwa</th>
              <th style={{ padding: '0.5rem', width: '65px' }}>Waga</th>
              <th style={{ padding: '0.5rem' }}>Składowe</th>
              <th style={{ padding: '0.5rem', width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>{idx + 1}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: 70, height: 70, objectFit: 'contain', borderRadius: 6, border: '1px solid #ddd', backgroundColor: '#fff' }} />
                  ) : (
                    <div style={{
                      width: 70, height: 70, backgroundColor: '#f0ece4', borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: '#999', border: '1px dashed #ccc'
                    }}>Brak</div>
                  )}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>{p.ean || '—'}</td>
                <td style={{ padding: '0.75rem 0.5rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{p.name}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 500 }}>{p.declared_weight_g ? `${p.declared_weight_g} g` : '—'}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  {p.recipe_items && p.recipe_items.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {p.recipe_items.map((r, i) => (
                        <span key={i} style={{
                          display: 'inline-block', padding: '2px 8px',
                          backgroundColor: '#f0ece4', borderRadius: '12px',
                          fontSize: '0.75rem', color: '#5a4633', border: '1px solid #e0d6c8',
                          whiteSpace: 'nowrap'
                        }}>{r.label}</span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#bbb', fontStyle: 'italic' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem 0.25rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <span
                      onClick={() => handleEditClick(p)}
                      title="Edytuj produkt"
                      style={{ cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                    >✏️</span>
                    <span
                      onClick={() => handleDeleteClick(p)}
                      title="Usuń produkt"
                      style={{ cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6, transition: 'opacity 0.2s', color: '#d9534f' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                    >🗑️</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '12px', 
            width: '650px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--choc-dark, #3a2a18)' }}>
              Edycja: {editingProduct.name}
            </h3>

            {/* Image section */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#faf8f5', borderRadius: '8px', border: '1px solid #eee' }}>
              <label className="form-label" style={{ fontWeight: 'bold' }}>Zdjęcie produktu</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                {editingProduct.imageUrl ? (
                  <img src={editingProduct.imageUrl} alt="Produkt" style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 8, border: '1px solid #ddd', backgroundColor: '#fff' }} />
                ) : (
                  <div style={{
                    width: 150, height: 150, backgroundColor: '#eaebed', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: '#888', border: '2px dashed #ccc'
                  }}>Brak zdjęcia</div>
                )}
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleImageUpload}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ marginBottom: '0.25rem' }}
                  >
                    {uploading ? 'Wgrywanie...' : (editingProduct.imageUrl ? 'Zmień zdjęcie' : 'Dodaj zdjęcie')}
                  </button>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>JPG, PNG, max 10 MB</div>
                </div>
              </div>
            </div>
            
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Kategoria</label>
              <select 
                className="form-control" 
                value={editCategoryId} 
                onChange={e => setEditCategoryId(e.target.value)}
              >
                <option value="">-- Wybierz kategorię --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">EAN</label>
              <input type="text" className="form-control" value={editEan} onChange={e => setEditEan(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Deklarowana waga (g)</label>
              <input type="number" className="form-control" value={editDeclaredWeight} onChange={e => setEditDeclaredWeight(e.target.value)} />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 'bold' }}>Składniki Produktu</label>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  list="ingredients-list"
                  type="text" 
                  className="form-control" 
                  placeholder="Dodaj nowy składnik..."
                  value={newIngredientInput} 
                  onChange={e => setNewIngredientInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addIngredient()}
                />
                <button className="btn btn-primary" onClick={addIngredient} type="button">Dodaj</button>
              </div>

              <datalist id="ingredients-list">
                {ingredientsMaster.map(i => <option key={i} value={i} />)}
              </datalist>

              {editIngredients.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>Brak przypisanych składników.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {editIngredients.map((ing, idx) => (
                    <li key={idx} style={{ 
                      padding: '0.6rem 0.75rem', 
                      backgroundColor: '#f9f9f9', 
                      marginBottom: '0.4rem', 
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #eee',
                    }}>
                      <span>{ing}</span>
                      <button 
                        style={{ border: 'none', background: 'none', color: '#d9534f', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }} 
                        onClick={() => removeIngredient(ing)}
                      >
                        ✕ Usuń
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={cancelEdit}>Anuluj</button>
              <button className="btn btn-primary" onClick={handleSave}>Zapisz Zmiany</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddingProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '12px', 
            width: '500px', maxWidth: '95%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--choc-dark, #3a2a18)' }}>
              Dodaj nowy produkt
            </h3>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 'bold' }}>Nazwa produktu <span style={{color: 'red'}}>*</span></label>
              <input 
                type="text" 
                className="form-control" 
                value={newProduct.name} 
                onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                placeholder="np. Tabliczka czekolady..."
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Kategoria</label>
              <select 
                className="form-control" 
                value={newProduct.category_id} 
                onChange={e => setNewProduct({...newProduct, category_id: e.target.value})}
              >
                <option value="">-- Wybierz kategorię --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">EAN</label>
              <input 
                type="text" 
                className="form-control" 
                value={newProduct.ean} 
                onChange={e => setNewProduct({...newProduct, ean: e.target.value})} 
                placeholder="Kod EAN"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Deklarowana waga (g)</label>
              <input 
                type="number" 
                className="form-control" 
                value={newProduct.declared_weight_g} 
                onChange={e => setNewProduct({...newProduct, declared_weight_g: e.target.value})} 
                placeholder="np. 90"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setIsAddingProduct(false)}>Anuluj</button>
              <button className="btn btn-primary" onClick={handleCreateProduct}>Dodaj Produkt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
