const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = 3001;

// ─── UPLOADS SETUP ───────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Use memoryStorage so we can name the file in the route handler (where req.params.id is available)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function computeMeasurement(m, declared_weight_g) {
  const product_weight_kg = +(m.full_box_weight_kg - m.empty_box_weight_kg).toFixed(4);
  const avg_piece_weight_g = m.piece_count > 0
    ? +((product_weight_kg * 1000) / m.piece_count).toFixed(2)
    : 0;
  const diff_g = +(avg_piece_weight_g - (declared_weight_g || 0)).toFixed(2);
  const diff_pct = declared_weight_g > 0
    ? +((diff_g / declared_weight_g) * 100).toFixed(2)
    : 0;
  return { ...m, product_weight_kg, avg_piece_weight_g, diff_g, diff_pct };
}

function sessionStats(session) {
  const d = db.data;
  const product  = d.products.find(p => p.id === session.product_id) || {};
  const operator = d.operators.find(o => o.id === session.operator_id) || {};
  const category = d.categories.find(c => c.id === session.category_id) || {};
  const recipe   = d.recipe_items.filter(r => r.product_id === session.product_id)
                                  .sort((a, b) => a.sort_order - b.sort_order);
  const measurements = d.measurements
    .filter(m => m.session_id === session.id)
    .sort((a, b) => a.seq - b.seq)
    .map(m => computeMeasurement(m, product.declared_weight_g));

  let totalPieces = 0, totalKg = 0, weightedSum = 0;
  measurements.forEach(m => {
    totalPieces  += m.piece_count;
    totalKg      += m.product_weight_kg;
    weightedSum  += m.avg_piece_weight_g * m.piece_count;
  });
  const avgG    = totalPieces > 0 ? weightedSum / totalPieces : 0;
  const declG   = product.declared_weight_g || 0;
  const tolG    = product.tolerance_g || 0;
  const diffG   = +(avgG - declG).toFixed(2);
  const diffPct = declG > 0 ? +((diffG / declG) * 100).toFixed(2) : 0;

  let sumDiffKg = 0;
  measurements.forEach(m => {
    sumDiffKg += m.product_weight_kg - (declG / 1000) * m.piece_count;
  });

  // Duration
  let duration = null;
  if (session.start_time && session.end_time) {
    const start = new Date(`${session.date_weighing}T${session.start_time}`);
    const end   = new Date(`${session.date_weighing}T${session.end_time}`);
    const mins  = Math.round((end - start) / 60000);
    duration = `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
  }

  // Quality status
  let quality_status = measurements.length === 0 ? 'OK' : 'OK';
  const warn = tolG * 0.8;
  for (const m of measurements) {
    const d = Math.abs(m.avg_piece_weight_g - declG);
    if (d > tolG) { quality_status = 'FAIL'; break; }
    if (d >= warn) quality_status = 'WARNING';
  }

  return {
    ...session,
    operator_name:    operator.name || '',
    category_name:    category.name || '',
    product_name:     product.name  || '',
    product_image_url: product.imageUrl || null,
    declared_weight_g: declG,
    tolerance_g:      tolG,
    measurement_count: measurements.length,
    avg_weight_g:     +avgG.toFixed(2),
    diff_g:           diffG,
    diff_pct:         diffPct,
    sum_diff_kg:      +sumDiffKg.toFixed(4),
    planned_consumption_kg: +(totalKg - sumDiffKg).toFixed(4),
    total_chocolate_kg: +totalKg.toFixed(4),
    duration,
    quality_status,
    measurements,
    recipe_items: recipe,
  };
}

// ─── OPERATORS ───────────────────────────────────────────────────────────────
app.get('/api/operators', (req, res) => {
  res.json(db.data.operators.slice().sort((a, b) => a.name.localeCompare(b.name)));
});

app.post('/api/operators', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = db.nextId('operators') + 100;
  const op = { id, name };
  db.data.operators.push(op);
  db.save();
  res.json(op);
});

app.delete('/api/operators/:id', (req, res) => {
  const id = +req.params.id;
  db.data.operators = db.data.operators.filter(o => o.id !== id);
  db.save();
  res.json({ ok: true });
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
app.get('/api/categories', (req, res) => {
  res.json(db.data.categories);
});

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category_id } = req.query;
  let list = db.data.products;
  if (category_id) list = list.filter(p => p.category_id === +category_id);
  const result = list.map(p => ({
    ...p,
    category_name: (db.data.categories.find(c => c.id === p.category_id) || {}).name || '',
    recipe_items: db.data.recipe_items.filter(r => r.product_id === p.id).sort((a, b) => a.sort_order - b.sort_order),
  })).sort((a, b) => a.name.localeCompare(b.name));
  res.json(result);
});

function calculateTolerance(w) {
  if (w <= 0) return 0;
  if (w <= 50) return parseFloat((w * 0.09).toFixed(1));
  if (w <= 100) return 4.5;
  if (w <= 200) return parseFloat((w * 0.045).toFixed(1));
  if (w <= 300) return 9;
  if (w <= 500) return parseFloat((w * 0.03).toFixed(1));
  return parseFloat((w * 0.03).toFixed(1));
}

app.post('/api/products', (req, res) => {
  const { name, ean, declared_weight_g, category_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const id = db.nextId('products');
  const weight = declared_weight_g ? +declared_weight_g : null;
  const newProduct = {
    id,
    name,
    ean: ean || '',
    category_id: category_id ? +category_id : null,
    declared_weight_g: weight,
    tolerance_g: weight ? calculateTolerance(weight) : 0,
    imageUrl: null
  };

  db.data.products.push(newProduct);
  db.save();
  res.status(201).json(newProduct);
});

app.get('/api/products/:id', (req, res) => {
  const product = db.data.products.find(p => p.id === +req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  const recipe = db.data.recipe_items
    .filter(r => r.product_id === product.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const category = db.data.categories.find(c => c.id === product.category_id) || {};
  res.json({ ...product, category_name: category.name || '', recipe_items: recipe });
});

app.put('/api/products/:id', (req, res) => {
  const id = +req.params.id;
  const product = db.data.products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Not found' });

  const { name, ean, imageUrl, recipe_items, category_id, declared_weight_g } = req.body;
  if (name !== undefined && name.trim()) product.name = name.trim();

  if (ean !== undefined) product.ean = ean;
  if (imageUrl !== undefined) product.imageUrl = imageUrl;
  if (category_id !== undefined) product.category_id = category_id ? +category_id : null;
  if (declared_weight_g !== undefined) {
    product.declared_weight_g = declared_weight_g ? +declared_weight_g : null;
    product.tolerance_g = product.declared_weight_g ? calculateTolerance(product.declared_weight_g) : 0;
  }
  
  if (Array.isArray(recipe_items)) {
    // Remove old recipe items
    db.data.recipe_items = db.data.recipe_items.filter(r => r.product_id !== id);
    // Add new ones
    recipe_items.forEach((item, index) => {
      db.data.recipe_items.push({
        id: db.nextId('recipe_items'),
        product_id: id,
        ingredient_type: item.ingredient_type || 'ingredient',
        label: item.label,
        sort_order: index + 1
      });
    });
  }

  db.save();
  res.json({ ok: true });
});

app.post('/api/products/:id/image', upload.single('image'), (req, res) => {
  const id = +req.params.id;
  const product = db.data.products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = `product_${id}_${Date.now()}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filepath, req.file.buffer);

  product.imageUrl = `/uploads/${filename}`;
  db.save();
  res.json({ ok: true, imageUrl: product.imageUrl });
});

app.get('/api/ingredients', (req, res) => {
  if (Array.isArray(db.data.ingredients)) {
    // Return only labels for backward compatibility (e.g. ProductsList datalist)
    const labels = db.data.ingredients.map(i => typeof i === 'string' ? i : i.label);
    return res.json(labels.sort());
  }
  const uniqueIngredients = [...new Set(db.data.recipe_items.map(r => r.label.trim()))].filter(Boolean);
  res.json(uniqueIngredients.sort());
});

app.get('/api/ingredients/all', (req, res) => {
  if (Array.isArray(db.data.ingredients)) {
    return res.json(db.data.ingredients);
  }
  res.json([]);
});

app.post('/api/ingredients', (req, res) => {
  const { label, category } = req.body;
  if (!label) return res.status(400).json({ error: 'Label is required' });
  
  if (!Array.isArray(db.data.ingredients)) db.data.ingredients = [];
  
  const trimmed = label.trim();
  const existing = db.data.ingredients.find(i => (typeof i === 'string' ? i : i.label) === trimmed);
  
  if (!existing) {
    db.data.ingredients.push({ label: trimmed, category: category || 'Dodatki' });
    db.save();
  } else if (typeof existing === 'object' && category) {
    existing.category = category;
    db.save();
  }
  
  res.status(201).json({ ok: true, label: trimmed });
});

app.delete('/api/ingredients/:label', (req, res) => {
  const labelParam = req.params.label;
  if (!Array.isArray(db.data.ingredients)) return res.status(404).json({ error: 'Not found' });
  
  db.data.ingredients = db.data.ingredients.filter(i => (typeof i === 'string' ? i : i.label) !== labelParam);
  db.save();
  res.json({ ok: true });
});

app.delete('/api/products/:id', (req, res) => {
  const id = +req.params.id;
  const productIndex = db.data.products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Remove the product
  db.data.products.splice(productIndex, 1);
  
  // Remove associated recipe items
  db.data.recipe_items = db.data.recipe_items.filter(r => r.product_id !== id);
  
  db.save();
  res.json({ ok: true });
});

// ─── SESSIONS ────────────────────────────────────────────────────────────────
app.post('/api/sessions', (req, res) => {
  const { operator_id, category_id, product_id, batch_numbers } = req.body;
  const id = db.nextId('sessions');
  const session = {
    id,
    operator_id: +operator_id,
    category_id: +category_id,
    product_id:  +product_id,
    batch_numbers: batch_numbers || {},
    date_weighing: null,
    start_time: null,
    end_time: null,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  db.data.sessions.push(session);
  db.save();
  res.json({ id });
});

app.patch('/api/sessions/:id', (req, res) => {
  const id = +req.params.id;
  const session = db.data.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const allowed = ['date_weighing', 'start_time', 'end_time', 'status', 'batch_numbers'];
  allowed.forEach(k => {
    if (req.body[k] !== undefined) session[k] = req.body[k];
  });
  db.save();
  res.json({ ok: true });
});

app.get('/api/sessions', (req, res) => {
  const { date_from, date_to, operator_id, category_id, product_id, batch_text, status } = req.query;
  let list = db.data.sessions.filter(s => {
    if (date_from && s.date_weighing && s.date_weighing < date_from) return false;
    if (date_to   && s.date_weighing && s.date_weighing > date_to)   return false;
    if (operator_id && s.operator_id !== +operator_id) return false;
    if (category_id && s.category_id !== +category_id) return false;
    if (product_id  && s.product_id  !== +product_id)  return false;
    if (status      && s.status      !== status)        return false;
    if (batch_text) {
      const bn = JSON.stringify(s.batch_numbers || {}).toLowerCase();
      if (!bn.includes(batch_text.toLowerCase())) return false;
    }
    return true;
  });
  // Sort: newest first
  list = list.slice().sort((a, b) => {
    const da = (a.date_weighing || '') + (a.start_time || '');
    const db2 = (b.date_weighing || '') + (b.start_time || '');
    return db2.localeCompare(da);
  });
  res.json(list.map(s => sessionStats(s)));
});

app.get('/api/sessions/:id', (req, res) => {
  const session = db.data.sessions.find(s => s.id === +req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(sessionStats(session));
});

app.delete('/api/sessions/:id', (req, res) => {
  const id = +req.params.id;
  const sessionIndex = db.data.sessions.findIndex(s => s.id === id);
  if (sessionIndex === -1) return res.status(404).json({ error: 'Not found' });

  // Remove session
  db.data.sessions.splice(sessionIndex, 1);
  // Remove associated measurements
  db.data.measurements = db.data.measurements.filter(m => m.session_id !== id);
  
  db.save();
  res.json({ ok: true });
});

// ─── MEASUREMENTS ─────────────────────────────────────────────────────────────
app.post('/api/sessions/:id/measurements', (req, res) => {
  const session_id = +req.params.id;
  const session = db.data.sessions.find(s => s.id === session_id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { empty_box_weight_kg, full_box_weight_kg, piece_count } = req.body;
  const existing = db.data.measurements.filter(m => m.session_id === session_id);
  const seq = existing.length > 0 ? Math.max(...existing.map(m => m.seq)) + 1 : 1;
  const id = db.nextId('measurements');
  const m = { 
    id, 
    session_id, 
    seq, 
    empty_box_weight_kg: +empty_box_weight_kg, 
    full_box_weight_kg: +full_box_weight_kg, 
    piece_count: +piece_count,
    created_at: new Date().toISOString()
  };
  db.data.measurements.push(m);
  db.save();
  const product = db.data.products.find(p => p.id === session.product_id) || {};
  res.json(computeMeasurement(m, product.declared_weight_g));
});

app.put('/api/sessions/:id/measurements/:mid', (req, res) => {
  const mid = +req.params.mid;
  const m = db.data.measurements.find(x => x.id === mid && x.session_id === +req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (req.body.empty_box_weight_kg !== undefined) m.empty_box_weight_kg = +req.body.empty_box_weight_kg;
  if (req.body.full_box_weight_kg  !== undefined) m.full_box_weight_kg  = +req.body.full_box_weight_kg;
  if (req.body.piece_count         !== undefined) m.piece_count         = +req.body.piece_count;
  db.save();
  const session = db.data.sessions.find(s => s.id === +req.params.id);
  const product = db.data.products.find(p => p.id === (session || {}).product_id) || {};
  res.json(computeMeasurement(m, product.declared_weight_g));
});

app.delete('/api/sessions/:id/measurements/:mid', (req, res) => {
  const mid = +req.params.mid;
  const sid = +req.params.id;
  db.data.measurements = db.data.measurements.filter(m => !(m.id === mid && m.session_id === sid));
  db.save();
  res.json({ ok: true });
});

// ─── EXPORT ──────────────────────────────────────────────────────────────────
app.get('/api/export/sessions', (req, res) => {
  const { date_from, date_to, operator_id, category_id, product_id, batch_text, report_type } = req.query;

  let list = db.data.sessions.filter(s => {
    if (s.status !== 'completed') return false;
    if (date_from && s.date_weighing && s.date_weighing < date_from) return false;
    if (date_to   && s.date_weighing && s.date_weighing > date_to)   return false;
    if (operator_id && s.operator_id !== +operator_id) return false;
    if (category_id && s.category_id !== +category_id) return false;
    if (product_id  && s.product_id  !== +product_id)  return false;
    if (batch_text) {
      const bn = JSON.stringify(s.batch_numbers || {}).toLowerCase();
      if (!bn.includes(batch_text.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => {
    const da = (a.date_weighing || '') + (a.start_time || '');
    const db2 = (b.date_weighing || '') + (b.start_time || '');
    return db2.localeCompare(da);
  });

  const wb = XLSX.utils.book_new();

  // Helper for batch number export
  const formatBatchValue = (bn, keyword) => {
    const key = Object.keys(bn).find(k => k.toLowerCase().includes(keyword.toLowerCase()));
    if (!key) return '';
    const val = bn[key];
    if (typeof val === 'object') {
      return `${val.batch} (${val.company})`;
    }
    return val;
  };

  if (report_type === 'detailed') {
    list.forEach(session => {
      const stats = sessionStats(session);
      const rows = stats.measurements.map(m => ({
        'Nr pomiaru': m.seq,
        'Godzina': m.created_at ? new Date(m.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Pusta skrzynka (kg)': m.empty_box_weight_kg,
        'Pełna skrzynka (kg)': m.full_box_weight_kg,
        'Ilość sztuk': m.piece_count,
        'Waga produktu (kg)': m.product_weight_kg,
        'Śr. waga 1 szt (g)': m.avg_piece_weight_g,
        'Różnica (g)': m.diff_g,
        'Różnica (%)': m.diff_pct,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Sesja_${session.id}`.substring(0, 31));
    });
  } else {
    const rows = list.map(session => {
      const stats = sessionStats(session);
      const bn = session.batch_numbers || {};
      return {
        'Data ważenia': session.date_weighing,
        'Godz. start': session.start_time,
        'Godz. koniec': session.end_time,
        'Czas trwania': stats.duration,
        'Operator': stats.operator_name,
        'Kategoria': stats.category_name,
        'Produkt': stats.product_name,
        'Liczba pomiarów': stats.measurement_count,
        'Śr. waga 1 szt (g)': stats.avg_weight_g,
        'Waga deklaro. (g)': stats.declared_weight_g,
        'Różnica śr (g)': stats.diff_g,
        'Różnica śr (%)': stats.diff_pct,
        'Suma różnic (kg)': stats.sum_diff_kg,
        'Planowane zużycie surowca (kg)': stats.planned_consumption_kg,
        'Całkowite zużycie (kg)': stats.total_chocolate_kg,
        'Nr partii – czekolada': formatBatchValue(bn, 'czekolada') || formatBatchValue(bn, 'polewa'),
        'Nr partii – barwnik': formatBatchValue(bn, 'barwnik'),
        'Nr partii – patyczek': formatBatchValue(bn, 'patyczek'),
        'Nr partii – owoce': formatBatchValue(bn, 'owoce') || formatBatchValue(bn, 'jabłko') || formatBatchValue(bn, 'malina') || formatBatchValue(bn, 'porzeczka'),
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sesje ważeń');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="raport_wazenia.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ─── ADMIN AUTH ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.data._admin || { username: 'admin', password: 'admin123' };
  if (username === admin.username && password === admin.password) {
    res.json({ ok: true, role: 'admin', username: admin.username });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.put('/api/auth/settings', (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  const admin = db.data._admin || { username: 'admin', password: 'admin123' };
  if (currentPassword !== admin.password) {
    return res.status(401).json({ error: 'Nieprawidłowe aktualne hasło' });
  }
  if (newUsername) db.data._admin.username = newUsername;
  if (newPassword) db.data._admin.password = newPassword;
  db.save();
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`🍫 Wagi backend running on http://localhost:${PORT}`));
