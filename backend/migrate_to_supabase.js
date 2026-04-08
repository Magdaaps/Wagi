require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { supabase, STORAGE_BUCKET } = require('./supabase');

const DB_PATH = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function ensureBucket() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data.find((bucket) => bucket.name === STORAGE_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  });
  if (createError) throw createError;
}

async function clearTables() {
  const tableDeletes = [
    ['session_operators', 'session_id', 'gt', 0],
    ['measurements', 'id', 'gt', 0],
    ['sessions', 'id', 'gt', 0],
    ['recipe_items', 'id', 'gt', 0],
    ['ingredients', 'id', 'gt', 0],
    ['products', 'id', 'gt', 0],
    ['operators', 'id', 'gt', 0],
    ['categories', 'id', 'gt', 0],
  ];

  for (const [table, column, operator, value] of tableDeletes) {
    const query = supabase.from(table).delete();
    const response = await query[operator](column, value);
    if (response.error) throw response.error;
  }

  const { error: adminError } = await supabase.from('admin_credentials').delete().eq('id', 1);
  if (adminError) throw adminError;
}

async function uploadImage(oldProductId, imageUrl) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!imageUrl.startsWith('/uploads/')) return imageUrl;

  const filename = imageUrl.replace('/uploads/', '');
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) return null;

  const ext = path.extname(filename).toLowerCase() || '.jpg';
  const contentType = ext === '.png'
    ? 'image/png'
    : ext === '.webp'
      ? 'image/webp'
      : ext === '.gif'
        ? 'image/gif'
        : 'image/jpeg';
  const storagePath = `products/imported/${oldProductId}-${filename}`;
  const buffer = fs.readFileSync(filePath);

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return storagePath;
}

async function insertRows(table, rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase.from(table).insert(rows).select('*');
  if (error) throw error;
  return data;
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Missing source file: ${DB_PATH}`);
  }

  await ensureBucket();
  await clearTables();

  const source = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const operatorIdMap = new Map();
  const categoryIdMap = new Map();
  const productIdMap = new Map();
  const sessionIdMap = new Map();

  const insertedOperators = await insertRows('operators', (source.operators || []).map((row) => ({
    name: row.name,
  })));
  insertedOperators.forEach((row, index) => operatorIdMap.set(source.operators[index].id, row.id));

  const insertedCategories = await insertRows('categories', (source.categories || []).map((row) => ({
    name: row.name,
  })));
  insertedCategories.forEach((row, index) => categoryIdMap.set(source.categories[index].id, row.id));

  for (const product of source.products || []) {
    const imagePath = await uploadImage(product.id, product.imageUrl);
    const { data, error } = await supabase.from('products').insert({
      name: product.name,
      ean: product.ean || null,
      category_id: product.category_id ? categoryIdMap.get(product.category_id) || null : null,
      declared_weight_g: product.declared_weight_g ?? null,
      tolerance_g: product.tolerance_g ?? 0,
      image_path: imagePath,
    }).select('*').single();
    if (error) throw error;
    productIdMap.set(product.id, data.id);
  }

  await insertRows('recipe_items', (source.recipe_items || []).map((row) => ({
    product_id: productIdMap.get(row.product_id),
    ingredient_type: row.ingredient_type || 'ingredient',
    label: row.label,
    sort_order: row.sort_order || 1,
  })));

  await insertRows('ingredients', (source.ingredients || []).map((row) => ({
    label: typeof row === 'string' ? row : row.label,
    category: typeof row === 'string' ? 'Dodatki' : (row.category || 'Dodatki'),
  })));

  for (const session of source.sessions || []) {
    const { data, error } = await supabase.from('sessions').insert({
      category_id: session.category_id ? categoryIdMap.get(session.category_id) || null : null,
      product_id: session.product_id ? productIdMap.get(session.product_id) || null : null,
      batch_numbers: session.batch_numbers || {},
      date_weighing: session.date_weighing || null,
      start_time: session.start_time || null,
      end_time: session.end_time || null,
      status: session.status || 'pending',
      created_at: session.created_at || new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;
    sessionIdMap.set(session.id, data.id);

    const operatorIds = Array.isArray(session.operator_ids)
      ? session.operator_ids
      : (session.operator_id ? [session.operator_id] : []);
    const rows = operatorIds
      .map((operatorId) => operatorIdMap.get(operatorId))
      .filter(Boolean)
      .map((operatorId) => ({ session_id: data.id, operator_id: operatorId }));
    await insertRows('session_operators', rows);
  }

  await insertRows('measurements', (source.measurements || []).map((row) => ({
    session_id: sessionIdMap.get(row.session_id),
    seq: row.seq,
    empty_box_weight_kg: row.empty_box_weight_kg,
    full_box_weight_kg: row.full_box_weight_kg,
    piece_count: row.piece_count,
    created_at: row.created_at || new Date().toISOString(),
  })));

  const admin = source._admin || { username: 'admin', password: 'admin123' };
  const passwordHash = await bcrypt.hash(admin.password || 'admin123', 10);
  const { error: adminError } = await supabase.from('admin_credentials').insert({
    id: 1,
    username: admin.username || 'admin',
    password_hash: passwordHash,
  });
  if (adminError) throw adminError;

  console.log('Migration complete.');
  console.log(JSON.stringify({
    operators: insertedOperators.length,
    categories: insertedCategories.length,
    products: source.products?.length || 0,
    recipe_items: source.recipe_items?.length || 0,
    ingredients: source.ingredients?.length || 0,
    sessions: source.sessions?.length || 0,
    measurements: source.measurements?.length || 0,
  }, null, 2));
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
