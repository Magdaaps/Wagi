const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// ─── INITIAL DATA STRUCTURE ──────────────────────────────────────────────────
const INITIAL = {
  operators: [
    { id: 1, name: 'Anna Kowalska' },
    { id: 2, name: 'Piotr Nowak' },
    { id: 3, name: 'Marta Wiśniewska' },
    { id: 4, name: 'Tomasz Zając' },
    { id: 5, name: 'Katarzyna Lewandowska' },
    { id: 6, name: 'Michał Dąbrowski' },
  ],
  categories: [
    { id: 1, name: 'Lizaki' },
    { id: 2, name: 'Figurki' },
    { id: 3, name: 'Czekolady' },
  ],
  products: [
    { id: 1, name: 'Lizak Truskawkowy',      category_id: 1, declared_weight_g: 35,  tolerance_g: 3 },
    { id: 2, name: 'Lizak Malinowy',          category_id: 1, declared_weight_g: 35,  tolerance_g: 3 },
    { id: 3, name: 'Lizak Cytrynowy',         category_id: 1, declared_weight_g: 30,  tolerance_g: 3 },
    { id: 4, name: 'Lizak Wiśniowy',          category_id: 1, declared_weight_g: 35,  tolerance_g: 3 },
    { id: 5, name: 'Mikołaj Czekoladowy',     category_id: 2, declared_weight_g: 80,  tolerance_g: 5 },
    { id: 6, name: 'Serce Mleczne',           category_id: 2, declared_weight_g: 60,  tolerance_g: 4 },
    { id: 7, name: 'Zajączek Wielkanocny',    category_id: 2, declared_weight_g: 100, tolerance_g: 6 },
    { id: 8, name: 'Czekolada Mleczna 100g',  category_id: 3, declared_weight_g: 100, tolerance_g: 4 },
    { id: 9, name: 'Czekolada Biała 100g',    category_id: 3, declared_weight_g: 100, tolerance_g: 4 },
    { id: 10, name: 'Czekolada Gorzka 90g',   category_id: 3, declared_weight_g: 90,  tolerance_g: 4 },
  ],
  recipe_items: [
    // Lizak Truskawkowy (1)
    { id: 1,  product_id: 1, ingredient_type: 'chocolate', label: 'Czekolada biała',           sort_order: 1 },
    { id: 2,  product_id: 1, ingredient_type: 'dye',       label: 'Barwnik: E120 (czerwony)',  sort_order: 2 },
    { id: 3,  product_id: 1, ingredient_type: 'stick',     label: 'Patyczek',                  sort_order: 3 },
    // Lizak Malinowy (2)
    { id: 4,  product_id: 2, ingredient_type: 'chocolate', label: 'Czekolada biała',           sort_order: 1 },
    { id: 5,  product_id: 2, ingredient_type: 'dye',       label: 'Barwnik: E120 (czerwony)',  sort_order: 2 },
    { id: 6,  product_id: 2, ingredient_type: 'stick',     label: 'Patyczek',                  sort_order: 3 },
    // Lizak Cytrynowy (3)
    { id: 7,  product_id: 3, ingredient_type: 'chocolate', label: 'Czekolada biała',           sort_order: 1 },
    { id: 8,  product_id: 3, ingredient_type: 'dye',       label: 'Barwnik: E100 (żółty)',     sort_order: 2 },
    { id: 9,  product_id: 3, ingredient_type: 'stick',     label: 'Patyczek',                  sort_order: 3 },
    // Lizak Wiśniowy (4)
    { id: 10, product_id: 4, ingredient_type: 'chocolate', label: 'Czekolada biała',           sort_order: 1 },
    { id: 11, product_id: 4, ingredient_type: 'dye',       label: 'Barwnik: E120 (czerwony)',  sort_order: 2 },
    { id: 12, product_id: 4, ingredient_type: 'stick',     label: 'Patyczek',                  sort_order: 3 },
    // Mikołaj Czekoladowy (5)
    { id: 13, product_id: 5, ingredient_type: 'chocolate', label: 'Czekolada mleczna',         sort_order: 1 },
    { id: 14, product_id: 5, ingredient_type: 'dye',       label: 'Barwnik: E160c (pomarańczowy)', sort_order: 2 },
    // Serce Mleczne (6)
    { id: 15, product_id: 6, ingredient_type: 'chocolate', label: 'Czekolada mleczna',         sort_order: 1 },
    // Zajączek Wielkanocny (7)
    { id: 16, product_id: 7, ingredient_type: 'chocolate', label: 'Czekolada mleczna',         sort_order: 1 },
    { id: 17, product_id: 7, ingredient_type: 'dye',       label: 'Barwnik: E100 (żółty)',     sort_order: 2 },
    // Czekolada Mleczna (8)
    { id: 18, product_id: 8, ingredient_type: 'chocolate', label: 'Czekolada mleczna',         sort_order: 1 },
    // Czekolada Biała (9)
    { id: 19, product_id: 9, ingredient_type: 'chocolate', label: 'Czekolada biała',           sort_order: 1 },
    // Czekolada Gorzka (10)
    { id: 20, product_id: 10, ingredient_type: 'chocolate', label: 'Czekolada gorzka',         sort_order: 1 },
  ],
  sessions: [],
  measurements: [],
  _seq: { sessions: 0, measurements: 0 },
  _admin: { username: 'admin', password: 'admin123' },
};

// ─── LOAD / SAVE ─────────────────────────────────────────────────────────────
function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL, null, 2), 'utf8');
    console.log('✅ Database initialized with seed data.');
    return INITIAL;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
let _data = load();

const db = {
  get data() { return _data; },

  reload() { _data = load(); },

  save() { save(_data); },

  nextId(collection) {
    _data._seq[collection] = (_data._seq[collection] || 0) + 1;
    return _data._seq[collection];
  },
};

module.exports = db;
