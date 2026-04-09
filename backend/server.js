require('dotenv').config();
const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const { supabase, STORAGE_BUCKET, getPublicImageUrl } = require('./supabase');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4174';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors({
  origin: true,
  credentials: false,
}));
app.use(express.json());

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function dbError(context, error) {
  const message = error && error.message ? error.message : 'Unknown database error';
  return new Error(`${context}: ${message}`);
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateTolerance(w) {
  if (w <= 0) return 0;
  if (w <= 50) return Number((w * 0.09).toFixed(1));
  if (w <= 100) return 4.5;
  if (w <= 200) return Number((w * 0.045).toFixed(1));
  if (w <= 300) return 9;
  return Number((w * 0.03).toFixed(1));
}

function computeMeasurement(m, declaredWeightG) {
  const productWeightKg = Number((Number(m.full_box_weight_kg) - Number(m.empty_box_weight_kg)).toFixed(4));
  const avgPieceWeightG = m.piece_count > 0
    ? Number(((productWeightKg * 1000) / m.piece_count).toFixed(2))
    : 0;
  const diffG = Number((avgPieceWeightG - (declaredWeightG || 0)).toFixed(2));
  const diffPct = declaredWeightG > 0
    ? Number(((diffG / declaredWeightG) * 100).toFixed(2))
    : 0;

  return {
    ...m,
    empty_box_weight_kg: Number(m.empty_box_weight_kg),
    full_box_weight_kg: Number(m.full_box_weight_kg),
    piece_count: Number(m.piece_count),
    product_weight_kg: productWeightKg,
    avg_piece_weight_g: avgPieceWeightG,
    diff_g: diffG,
    diff_pct: diffPct,
  };
}

function byId(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function isExternalUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function sanitizeFilename(name) {
  return String(name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function shapeProduct(product, recipeItems) {
  return {
    ...product,
    declared_weight_g: product.declared_weight_g === null ? null : Number(product.declared_weight_g),
    tolerance_g: Number(product.tolerance_g),
    imageUrl: getPublicImageUrl(product.image_path),
    recipe_items: recipeItems,
  };
}

async function ensureStorageBucket() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw dbError('Unable to list storage buckets', error);

  if (!data.find((bucket) => bucket.name === STORAGE_BUCKET)) {
    const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    });
    if (createError) throw dbError('Unable to create storage bucket', createError);
  }
}

async function ensureAdminCredentials() {
  const { data, error } = await supabase
    .from('admin_credentials')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw dbError('Unable to read admin credentials', error);
  if (data) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);
  const { error: insertError } = await supabase.from('admin_credentials').insert({
    id: 1,
    username,
    password_hash: passwordHash,
  });

  if (insertError) throw dbError('Unable to initialize admin credentials', insertError);
}

async function fetchRecipeItemsByProductIds(productIds) {
  if (!productIds.length) return [];
  const { data, error } = await supabase
    .from('recipe_items')
    .select('*')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });

  if (error) throw dbError('Unable to read recipe items', error);
  return data;
}

async function fetchProductsWithRecipes(categoryId) {
  let query = supabase.from('products').select('*');
  if (categoryId) query = query.eq('category_id', Number(categoryId));

  const { data: products, error } = await query;
  if (error) throw dbError('Unable to read products', error);

  const recipeItems = await fetchRecipeItemsByProductIds(products.map((product) => product.id));
  const recipeMap = new Map();
  for (const item of recipeItems) {
    const list = recipeMap.get(item.product_id) || [];
    list.push(item);
    recipeMap.set(item.product_id, list);
  }

  const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');
  if (categoriesError) throw dbError('Unable to read categories', categoriesError);
  const categoryMap = byId(categories);

  return products
    .map((product) => ({
      ...shapeProduct(product, recipeMap.get(product.id) || []),
      category_name: categoryMap.get(product.category_id)?.name || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

async function fetchSessionStatsRows(filters = {}) {
  let query = supabase.from('sessions').select('*');
  if (filters.date_from) query = query.gte('date_weighing', filters.date_from);
  if (filters.date_to) query = query.lte('date_weighing', filters.date_to);
  if (filters.category_id) query = query.eq('category_id', Number(filters.category_id));
  if (filters.product_id) query = query.eq('product_id', Number(filters.product_id));
  if (filters.status) query = query.eq('status', filters.status);

  const { data: sessions, error } = await query;
  if (error) throw dbError('Unable to read sessions', error);
  if (!sessions.length) return [];

  const sessionIds = sessions.map((session) => session.id);
  const productIds = [...new Set(sessions.map((session) => session.product_id).filter(Boolean))];
  const categoryIds = [...new Set(sessions.map((session) => session.category_id).filter(Boolean))];

  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
    { data: sessionOperators, error: sessionOperatorsError },
    { data: measurements, error: measurementsError },
    { data: recipeItems, error: recipeItemsError },
  ] = await Promise.all([
    supabase.from('products').select('*').in('id', productIds),
    supabase.from('categories').select('*').in('id', categoryIds),
    supabase.from('session_operators').select('*').in('session_id', sessionIds),
    supabase.from('measurements').select('*').in('session_id', sessionIds).order('seq', { ascending: true }),
    fetchRecipeItemsByProductIds(productIds).then((data) => ({ data, error: null })).catch((innerError) => ({ data: null, error: innerError })),
  ]);

  if (productsError) throw dbError('Unable to read products for sessions', productsError);
  if (categoriesError) throw dbError('Unable to read categories for sessions', categoriesError);
  if (sessionOperatorsError) throw dbError('Unable to read session operators', sessionOperatorsError);
  if (measurementsError) throw dbError('Unable to read measurements', measurementsError);
  if (recipeItemsError) throw recipeItemsError;

  const operatorIds = [...new Set(sessionOperators.map((item) => item.operator_id))];
  const { data: operators, error: operatorsError } = operatorIds.length
    ? await supabase.from('operators').select('*').in('id', operatorIds)
    : { data: [], error: null };

  if (operatorsError) throw dbError('Unable to read operators', operatorsError);

  const productMap = byId(products);
  const categoryMap = byId(categories);
  const operatorMap = byId(operators);

  const measurementsMap = new Map();
  for (const row of measurements) {
    const list = measurementsMap.get(row.session_id) || [];
    list.push(row);
    measurementsMap.set(row.session_id, list);
  }

  const recipeMap = new Map();
  for (const item of recipeItems) {
    const list = recipeMap.get(item.product_id) || [];
    list.push(item);
    recipeMap.set(item.product_id, list);
  }

  const sessionOperatorMap = new Map();
  for (const row of sessionOperators) {
    const list = sessionOperatorMap.get(row.session_id) || [];
    list.push(row.operator_id);
    sessionOperatorMap.set(row.session_id, list);
  }

  const stats = sessions.map((session) => {
    const product = productMap.get(session.product_id) || {};
    const category = categoryMap.get(session.category_id) || {};
    const operatorIdsForSession = sessionOperatorMap.get(session.id) || [];
    const operatorNames = operatorIdsForSession
      .map((id) => operatorMap.get(id)?.name || '')
      .filter(Boolean)
      .join(', ');
    const recipe = (recipeMap.get(session.product_id) || []).sort((a, b) => a.sort_order - b.sort_order);
    const sessionMeasurements = (measurementsMap.get(session.id) || []).map((measurement) =>
      computeMeasurement(measurement, Number(product.declared_weight_g || 0))
    );

    let totalPieces = 0;
    let totalKg = 0;
    let weightedSum = 0;
    for (const measurement of sessionMeasurements) {
      totalPieces += measurement.piece_count;
      totalKg += measurement.product_weight_kg;
      weightedSum += measurement.avg_piece_weight_g * measurement.piece_count;
    }

    const declaredWeight = Number(product.declared_weight_g || 0);
    const tolerance = Number(product.tolerance_g || 0);
    const avgWeight = totalPieces > 0 ? weightedSum / totalPieces : 0;
    const diffG = Number((avgWeight - declaredWeight).toFixed(2));
    const diffPct = declaredWeight > 0 ? Number(((diffG / declaredWeight) * 100).toFixed(2)) : 0;

    let sumDiffKg = 0;
    for (const measurement of sessionMeasurements) {
      sumDiffKg += measurement.product_weight_kg - (declaredWeight / 1000) * measurement.piece_count;
    }

    let duration = null;
    if (session.date_weighing && session.start_time && session.end_time) {
      const start = new Date(`${session.date_weighing}T${session.start_time}`);
      const end = new Date(`${session.date_weighing}T${session.end_time}`);
      const mins = Math.round((end - start) / 60000);
      duration = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }

    let qualityStatus = 'OK';
    const warningThreshold = tolerance * 0.8;
    for (const measurement of sessionMeasurements) {
      const distance = Math.abs(measurement.avg_piece_weight_g - declaredWeight);
      if (distance > tolerance) {
        qualityStatus = 'FAIL';
        break;
      }
      if (distance >= warningThreshold) qualityStatus = 'WARNING';
    }

    return {
      ...session,
      operator_ids: operatorIdsForSession,
      operator_name: operatorNames,
      category_name: category.name || '',
      product_name: product.name || '',
      product_image_url: getPublicImageUrl(product.image_path),
      declared_weight_g: declaredWeight,
      tolerance_g: tolerance,
      measurement_count: sessionMeasurements.length,
      total_piece_count: totalPieces,
      avg_weight_g: Number(avgWeight.toFixed(2)),
      diff_g: diffG,
      diff_pct: diffPct,
      sum_diff_kg: Number(sumDiffKg.toFixed(4)),
      planned_consumption_kg: Number((totalKg - sumDiffKg).toFixed(4)),
      total_chocolate_kg: Number(totalKg.toFixed(4)),
      duration,
      quality_status: qualityStatus,
      measurements: sessionMeasurements,
      recipe_items: recipe,
    };
  });

  return stats
    .filter((session) => {
      if (filters.operator_id && !session.operator_ids.includes(Number(filters.operator_id))) return false;
      if (filters.batch_text) {
        const normalize = (value) => String(value).toLowerCase().replace(/[.,]/g, '.');
        const batch = normalize(JSON.stringify(session.batch_numbers || {}));
        if (!batch.includes(normalize(filters.batch_text))) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const first = `${b.date_weighing || ''}${b.start_time || ''}`;
      const second = `${a.date_weighing || ''}${a.start_time || ''}`;
      return first.localeCompare(second);
    });
}

app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Wagi Backend</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 720px;
        margin: 40px auto;
        padding: 0 16px;
        line-height: 1.5;
      }
      a {
        color: #0b63ce;
      }
      code {
        background: #f3f4f6;
        padding: 2px 6px;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <h1>Backend dziala poprawnie</h1>
    <p>Adres API jest gotowy do pracy z frontendem na Vercelu.</p>
    <p>Domyslny frontend lokalny: <a href="${FRONTEND_URL}/tablet">${FRONTEND_URL}/tablet</a></p>
  </body>
</html>`);
});

app.get('/api/operators', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('operators').select('*');
  if (error) throw dbError('Unable to read operators', error);
  res.json(data.sort((a, b) => a.name.localeCompare(b.name, 'pl')));
}));

app.post('/api/operators', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });

  const { data, error } = await supabase.from('operators').insert({ name }).select('*').single();
  if (error) throw dbError('Unable to create operator', error);
  res.status(201).json(data);
}));

app.delete('/api/operators/:id', asyncHandler(async (req, res) => {
  const { error } = await supabase.from('operators').delete().eq('id', Number(req.params.id));
  if (error) throw dbError('Unable to delete operator', error);
  res.json({ ok: true });
}));

app.get('/api/categories', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
  if (error) throw dbError('Unable to read categories', error);
  res.json(data);
}));

app.get('/api/products', asyncHandler(async (req, res) => {
  const rows = await fetchProductsWithRecipes(req.query.category_id);
  res.json(rows);
}));

app.post('/api/products', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const declaredWeight = normalizeNumber(req.body.declared_weight_g);
  const payload = {
    name,
    ean: req.body.ean ? String(req.body.ean) : null,
    category_id: req.body.category_id ? Number(req.body.category_id) : null,
    declared_weight_g: declaredWeight,
    tolerance_g: declaredWeight ? calculateTolerance(declaredWeight) : 0,
    image_path: null,
  };

  const { data, error } = await supabase.from('products').insert(payload).select('*').single();
  if (error) throw dbError('Unable to create product', error);
  res.status(201).json(shapeProduct(data, []));
}));

app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', Number(req.params.id))
    .maybeSingle();

  if (error) throw dbError('Unable to read product', error);
  if (!product) return res.status(404).json({ error: 'Not found' });

  const [recipeItems, categoryResult] = await Promise.all([
    fetchRecipeItemsByProductIds([product.id]),
    supabase.from('categories').select('*').eq('id', product.category_id).maybeSingle(),
  ]);

  if (categoryResult.error) throw dbError('Unable to read category', categoryResult.error);

  res.json({
    ...shapeProduct(product, recipeItems),
    category_name: categoryResult.data?.name || '',
  });
}));

app.put('/api/products/:id', asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (existingError) throw dbError('Unable to read product before update', existingError);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const patch = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required' });
    patch.name = name;
  }
  if (req.body.ean !== undefined) patch.ean = req.body.ean ? String(req.body.ean) : null;
  if (req.body.category_id !== undefined) patch.category_id = req.body.category_id ? Number(req.body.category_id) : null;
  if (req.body.declared_weight_g !== undefined) {
    const declaredWeight = normalizeNumber(req.body.declared_weight_g);
    patch.declared_weight_g = declaredWeight;
    patch.tolerance_g = declaredWeight ? calculateTolerance(declaredWeight) : 0;
  }
  if (req.body.imageUrl !== undefined) patch.image_path = req.body.imageUrl || null;

  if (Object.keys(patch).length) {
    const { error: updateError } = await supabase.from('products').update(patch).eq('id', productId);
    if (updateError) throw dbError('Unable to update product', updateError);
  }

  if (Array.isArray(req.body.recipe_items)) {
    const { error: deleteError } = await supabase.from('recipe_items').delete().eq('product_id', productId);
    if (deleteError) throw dbError('Unable to replace recipe items', deleteError);

    const rows = req.body.recipe_items
      .map((item, index) => ({
        product_id: productId,
        ingredient_type: item.ingredient_type || 'ingredient',
        label: String(item.label || '').trim(),
        sort_order: index + 1,
      }))
      .filter((item) => item.label);

    if (rows.length) {
      const { error: insertError } = await supabase.from('recipe_items').insert(rows);
      if (insertError) throw dbError('Unable to insert recipe items', insertError);
    }
  }

  res.json({ ok: true });
}));

app.post('/api/products/:id/image', upload.single('image'), asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw dbError('Unable to read product before image upload', productError);
  if (!product) return res.status(404).json({ error: 'Not found' });

  const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const filename = sanitizeFilename(req.file.originalname.replace(/\.[^.]+$/, '')) || 'product';
  const storagePath = `products/${productId}/${Date.now()}-${filename}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (uploadError) throw dbError('Unable to upload image to storage', uploadError);

  if (product.image_path && !isExternalUrl(product.image_path)) {
    await supabase.storage.from(STORAGE_BUCKET).remove([product.image_path]);
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({ image_path: storagePath })
    .eq('id', productId);

  if (updateError) throw dbError('Unable to save image path', updateError);

  res.json({ ok: true, imageUrl: getPublicImageUrl(storagePath) });
}));

app.get('/api/ingredients', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('ingredients').select('*').order('label', { ascending: true });
  if (error) throw dbError('Unable to read ingredients', error);
  res.json(data.map((item) => item.label));
}));

app.get('/api/ingredients/all', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('ingredients').select('*').order('label', { ascending: true });
  if (error) throw dbError('Unable to read ingredients', error);
  res.json(data);
}));

app.post('/api/ingredients', asyncHandler(async (req, res) => {
  const label = String(req.body.label || '').trim();
  if (!label) return res.status(400).json({ error: 'Label is required' });

  const category = String(req.body.category || 'Dodatki').trim() || 'Dodatki';
  const { data: existing, error: existingError } = await supabase
    .from('ingredients')
    .select('*')
    .eq('label', label)
    .maybeSingle();

  if (existingError) throw dbError('Unable to read ingredient', existingError);

  if (existing) {
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ category })
      .eq('id', existing.id);
    if (updateError) throw dbError('Unable to update ingredient', updateError);
  } else {
    const { error: insertError } = await supabase.from('ingredients').insert({ label, category });
    if (insertError) throw dbError('Unable to create ingredient', insertError);
  }

  res.status(201).json({ ok: true, label });
}));

app.delete('/api/ingredients/:label', asyncHandler(async (req, res) => {
  const { error } = await supabase.from('ingredients').delete().eq('label', req.params.label);
  if (error) throw dbError('Unable to delete ingredient', error);
  res.json({ ok: true });
}));

app.delete('/api/products/:id', asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw dbError('Unable to read product before delete', productError);
  if (!product) return res.status(404).json({ error: 'Not found' });

  if (product.image_path && !isExternalUrl(product.image_path)) {
    await supabase.storage.from(STORAGE_BUCKET).remove([product.image_path]);
  }

  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw dbError('Unable to delete product', error);
  res.json({ ok: true });
}));

app.post('/api/sessions', asyncHandler(async (req, res) => {
  const operatorIds = Array.isArray(req.body.operator_ids)
    ? [...new Set(req.body.operator_ids.map(Number).filter(Boolean))]
    : [];

  const payload = {
    category_id: req.body.category_id ? Number(req.body.category_id) : null,
    product_id: req.body.product_id ? Number(req.body.product_id) : null,
    batch_numbers: req.body.batch_numbers || {},
    date_weighing: null,
    start_time: null,
    end_time: null,
    status: 'pending',
  };

  const { data: session, error } = await supabase.from('sessions').insert(payload).select('*').single();
  if (error) throw dbError('Unable to create session', error);

  if (operatorIds.length) {
    const rows = operatorIds.map((operatorId) => ({ session_id: session.id, operator_id: operatorId }));
    const { error: linkError } = await supabase.from('session_operators').insert(rows);
    if (linkError) throw dbError('Unable to create session operators', linkError);
  }

  res.json({ id: session.id });
}));

app.patch('/api/sessions/:id', asyncHandler(async (req, res) => {
  const sessionId = Number(req.params.id);
  const patch = {};
  const allowed = ['date_weighing', 'start_time', 'end_time', 'status', 'batch_numbers'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const { error } = await supabase.from('sessions').update(patch).eq('id', sessionId);
  if (error) throw dbError('Unable to update session', error);
  res.json({ ok: true });
}));

app.get('/api/sessions', asyncHandler(async (req, res) => {
  const rows = await fetchSessionStatsRows(req.query);
  res.json(rows);
}));

app.get('/api/sessions/:id', asyncHandler(async (req, res) => {
  const rows = await fetchSessionStatsRows({});
  const session = rows.find((item) => item.id === Number(req.params.id));
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
}));

app.delete('/api/sessions/:id', asyncHandler(async (req, res) => {
  const { error } = await supabase.from('sessions').delete().eq('id', Number(req.params.id));
  if (error) throw dbError('Unable to delete session', error);
  res.json({ ok: true });
}));

app.post('/api/sessions/:id/measurements', asyncHandler(async (req, res) => {
  const sessionId = Number(req.params.id);
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) throw dbError('Unable to read session before measurement insert', sessionError);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { data: existing, error: existingError } = await supabase
    .from('measurements')
    .select('seq')
    .eq('session_id', sessionId)
    .order('seq', { ascending: false })
    .limit(1);

  if (existingError) throw dbError('Unable to read current measurement sequence', existingError);

  const seq = existing.length ? Number(existing[0].seq) + 1 : 1;
  const payload = {
    session_id: sessionId,
    seq,
    empty_box_weight_kg: Number(req.body.empty_box_weight_kg),
    full_box_weight_kg: Number(req.body.full_box_weight_kg),
    piece_count: Number(req.body.piece_count),
  };

  const { data: measurement, error } = await supabase.from('measurements').insert(payload).select('*').single();
  if (error) throw dbError('Unable to create measurement', error);

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', session.product_id)
    .maybeSingle();

  if (productError) throw dbError('Unable to read product for measurement', productError);

  res.json(computeMeasurement(measurement, Number(product?.declared_weight_g || 0)));
}));

app.put('/api/sessions/:id/measurements/:mid', asyncHandler(async (req, res) => {
  const measurementId = Number(req.params.mid);
  const sessionId = Number(req.params.id);

  const patch = {};
  if (req.body.empty_box_weight_kg !== undefined) patch.empty_box_weight_kg = Number(req.body.empty_box_weight_kg);
  if (req.body.full_box_weight_kg !== undefined) patch.full_box_weight_kg = Number(req.body.full_box_weight_kg);
  if (req.body.piece_count !== undefined) patch.piece_count = Number(req.body.piece_count);

  const { data: measurement, error } = await supabase
    .from('measurements')
    .update(patch)
    .eq('id', measurementId)
    .eq('session_id', sessionId)
    .select('*')
    .maybeSingle();

  if (error) throw dbError('Unable to update measurement', error);
  if (!measurement) return res.status(404).json({ error: 'Not found' });

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('product_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) throw dbError('Unable to read session for measurement update', sessionError);

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('declared_weight_g')
    .eq('id', session?.product_id)
    .maybeSingle();

  if (productError) throw dbError('Unable to read product for measurement update', productError);

  res.json(computeMeasurement(measurement, Number(product?.declared_weight_g || 0)));
}));

app.delete('/api/sessions/:id/measurements/:mid', asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('measurements')
    .delete()
    .eq('id', Number(req.params.mid))
    .eq('session_id', Number(req.params.id));

  if (error) throw dbError('Unable to delete measurement', error);
  res.json({ ok: true });
}));

app.get('/api/export/sessions', asyncHandler(async (req, res) => {
  const rows = (await fetchSessionStatsRows(req.query)).filter((row) => row.status === 'completed');
  const wb = XLSX.utils.book_new();

  if (req.query.report_type === 'detailed') {
    rows.forEach((session) => {
      const bn = session.batch_numbers || {};
      const aoa = [];
      aoa.push([`Szczegoly sesji #${session.id}`], []);
      aoa.push(['INFORMACJE OGOLNE']);
      aoa.push(['Operator:', session.operator_name], ['Kategoria:', session.category_name], ['Produkt:', session.product_name]);
      aoa.push(['Data:', session.date_weighing], ['Start/Koniec:', `${session.start_time || ''} - ${session.end_time || ''}`], ['Czas trwania:', session.duration || ''], []);
      aoa.push(['WYLICZENIA']);
      aoa.push(['Dekl. waga (g):', `${session.declared_weight_g} g (+/-${session.tolerance_g}g)`]);
      aoa.push(['Ilosc sztuk:', `${session.total_piece_count} szt`]);
      aoa.push(['Sr. waga 1 szt (g):', session.avg_weight_g], ['Roznica (g):', session.diff_g], ['Roznica (%):', session.diff_pct]);
      const hasPatyczki = (session.recipe_items || []).some((r) => (r.label || '').toLowerCase().includes('patyczki papierowe'));
      const patyczkiRow = hasPatyczki ? [['Waga patyczkow (kg):', Number((session.total_piece_count * 0.001).toFixed(3))]] : [];
      aoa.push(['Suma roznic (kg):', session.sum_diff_kg], ['Planowane zuzycie surowca (kg):', session.planned_consumption_kg], ['Calkowite zuzycie (kg):', session.total_chocolate_kg], ...patyczkiRow, []);
      if (Object.keys(bn).length > 0) {
        aoa.push(['NUMERY PARTII SUROWCOW']);
        Object.keys(bn).forEach((key) => {
          const value = bn[key];
          aoa.push([`${key}:`, typeof value === 'object' ? `${value.batch} (${value.company})` : value]);
        });
        aoa.push([]);
      }
      aoa.push(['POMIARY'], ['Nr', 'Godzina', 'Pusta skrzynka (kg)', 'Pelna skrzynka (kg)', 'Ilosc sztuk', 'Waga produktu (kg)', 'Sr. waga 1 szt (g)', 'Roznica (g)', 'Roznica (%)']);
      session.measurements.forEach((measurement) => {
        const time = measurement.created_at
          ? new Date(measurement.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
          : '-';
        aoa.push([
          measurement.seq,
          time,
          measurement.empty_box_weight_kg,
          measurement.full_box_weight_kg,
          measurement.piece_count,
          measurement.product_weight_kg,
          measurement.avg_piece_weight_g,
          measurement.diff_g,
          measurement.diff_pct,
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, `Sesja_${session.id}`.substring(0, 31));
    });
  } else {
    const allBatchKeys = [];
    rows.forEach((session) => {
      Object.keys(session.batch_numbers || {}).forEach((key) => {
        if (!allBatchKeys.includes(key)) allBatchKeys.push(key);
      });
    });

    const exportRows = rows.map((session) => {
      const row = {
        'Data wazenia': session.date_weighing,
        'Godz. start': session.start_time,
        'Godz. koniec': session.end_time,
        'Czas trwania': session.duration,
        'Operator': session.operator_name,
        'Kategoria': session.category_name,
        'Produkt': session.product_name,
        'Liczba pomiarow': session.measurement_count,
        'Sr. waga 1 szt (g)': session.avg_weight_g,
        'Waga deklaro. (g)': session.declared_weight_g,
        'Roznica sr (g)': session.diff_g,
        'Roznica sr (%)': session.diff_pct,
        'Suma roznic (kg)': session.sum_diff_kg,
        'Planowane zuzycie surowca (kg)': session.planned_consumption_kg,
        'Calkowite zuzycie (kg)': session.total_chocolate_kg,
      };

      allBatchKeys.forEach((key) => {
        const value = session.batch_numbers?.[key];
        if (value === undefined) {
          row[`Nr partii - ${key}`] = '';
        } else if (typeof value === 'object') {
          row[`Nr partii - ${key}`] = `${value.batch} (${value.company})`;
        } else {
          row[`Nr partii - ${key}`] = value;
        }
      });

      return row;
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), 'Sesje wazen');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="raport_wazenia.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { data: admin, error } = await supabase
    .from('admin_credentials')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw dbError('Unable to read admin credentials during login', error);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const username = String(req.body.username || '');
  const password = String(req.body.password || '');
  const matches = username === admin.username && await bcrypt.compare(password, admin.password_hash);

  if (!matches) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ ok: true, role: 'admin', username: admin.username });
}));

app.put('/api/auth/settings', asyncHandler(async (req, res) => {
  const { data: admin, error } = await supabase
    .from('admin_credentials')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw dbError('Unable to read admin credentials during update', error);
  if (!admin) return res.status(404).json({ error: 'Admin settings not found' });

  const currentPassword = String(req.body.currentPassword || '');
  const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Nieprawidlowe aktualne haslo' });
  }

  const patch = {};
  if (req.body.newUsername) patch.username = String(req.body.newUsername).trim();
  if (req.body.newPassword) patch.password_hash = await bcrypt.hash(String(req.body.newPassword), 10);

  const { error: updateError } = await supabase.from('admin_credentials').update(patch).eq('id', 1);
  if (updateError) throw dbError('Unable to update admin credentials', updateError);

  res.json({ ok: true });
}));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  await ensureStorageBucket();
  await ensureAdminCredentials();
  app.listen(PORT, () => {
    console.log(`Wagi backend running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
