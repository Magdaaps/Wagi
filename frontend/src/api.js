const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Operators
  getOperators: () => req('/operators'),
  createOperator: (name) => req('/operators', { method: 'POST', body: { name } }),
  deleteOperator: (id) => req(`/operators/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => req('/categories'),

  // Products
  getProducts: (category_id) => req(`/products${category_id ? `?category_id=${category_id}` : ''}`),
  getProduct: (id) => req(`/products/${id}`),
  createProduct: (body) => req('/products', { method: 'POST', body }),
  updateProduct: (id, body) => req(`/products/${id}`, { method: 'PUT', body }),
  deleteProduct: (id) => req(`/products/${id}`, { method: 'DELETE' }),

  // Ingredients
  getIngredients: () => req('/ingredients'),
  getIngredientsAll: () => req('/ingredients/all'),
  addIngredient: (label, category) => req('/ingredients', { method: 'POST', body: { label, category } }),
  deleteIngredient: (label) => req(`/ingredients/${encodeURIComponent(label)}`, { method: 'DELETE' }),

  // Sessions
  createSession: (body) => req('/sessions', { method: 'POST', body }),
  updateSession: (id, body) => req(`/sessions/${id}`, { method: 'PATCH', body }),
  getSessions: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
    return req(`/sessions?${q}`);
  },
  getSession: (id) => req(`/sessions/${id}`),
  deleteSession: (id) => req(`/sessions/${id}`, { method: 'DELETE' }),

  // Measurements
  addMeasurement: (sessionId, body) => req(`/sessions/${sessionId}/measurements`, { method: 'POST', body }),
  updateMeasurement: (sessionId, mid, body) => req(`/sessions/${sessionId}/measurements/${mid}`, { method: 'PUT', body }),
  deleteMeasurement: (sessionId, mid) => req(`/sessions/${sessionId}/measurements/${mid}`, { method: 'DELETE' }),

  // Auth
  login: (username, password) => req('/auth/login', { method: 'POST', body: { username, password } }),

  // Export
  exportUrl: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
    return `${BASE}/export/sessions?${q}`;
  },
};
