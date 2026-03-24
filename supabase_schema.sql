DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS recipe_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE operators (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ean TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  declared_weight_g NUMERIC(10, 2),
  tolerance_g NUMERIC(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT
);

CREATE TABLE recipe_items (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_type TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Dodatki'
);

CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  batch_numbers JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_weighing DATE,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE measurements (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  empty_box_weight_kg NUMERIC(10, 3) NOT NULL,
  full_box_weight_kg NUMERIC(10, 3) NOT NULL,
  piece_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_recipe_items_product_id ON recipe_items(product_id);
CREATE INDEX idx_sessions_operator_id ON sessions(operator_id);
CREATE INDEX idx_sessions_category_id ON sessions(category_id);
CREATE INDEX idx_sessions_product_id ON sessions(product_id);
CREATE INDEX idx_measurements_session_id ON measurements(session_id);

INSERT INTO operators (id, name) VALUES
  (1, 'Anna Kowalska'),
  (2, 'Piotr Nowak'),
  (3, 'Marta Wiśniewska'),
  (4, 'Tomasz Zając'),
  (5, 'Katarzyna Lewandowska'),
  (6, 'Michał Dąbrowski');

INSERT INTO categories (id, name) VALUES
  (1, 'Lizaki'),
  (2, 'Figurki'),
  (3, 'Czekolady');

INSERT INTO products (id, name, ean, category_id, declared_weight_g, tolerance_g, image_url) VALUES
  (1, 'Lizak Truskawkowy', NULL, 1, 35, 3, NULL),
  (2, 'Lizak Malinowy', NULL, 1, 35, 3, NULL),
  (3, 'Lizak Cytrynowy', NULL, 1, 30, 3, NULL),
  (4, 'Lizak Wiśniowy', NULL, 1, 35, 3, NULL),
  (5, 'Mikołaj Czekoladowy', NULL, 2, 80, 5, NULL),
  (6, 'Serce Mleczne', NULL, 2, 60, 4, NULL),
  (7, 'Zajączek Wielkanocny', NULL, 2, 100, 6, NULL),
  (8, 'Czekolada Mleczna 100g', NULL, 3, 100, 4, NULL),
  (9, 'Czekolada Biała 100g', NULL, 3, 100, 4, NULL),
  (10, 'Czekolada Gorzka 90g', NULL, 3, 90, 4, NULL);

INSERT INTO recipe_items (id, product_id, ingredient_type, label, sort_order) VALUES
  (1, 1, 'chocolate', 'Czekolada biała', 1),
  (2, 1, 'dye', 'Barwnik: E120 (czerwony)', 2),
  (3, 1, 'stick', 'Patyczek', 3),
  (4, 2, 'chocolate', 'Czekolada biała', 1),
  (5, 2, 'dye', 'Barwnik: E120 (czerwony)', 2),
  (6, 2, 'stick', 'Patyczek', 3),
  (7, 3, 'chocolate', 'Czekolada biała', 1),
  (8, 3, 'dye', 'Barwnik: E100 (żółty)', 2),
  (9, 3, 'stick', 'Patyczek', 3),
  (10, 4, 'chocolate', 'Czekolada biała', 1),
  (11, 4, 'dye', 'Barwnik: E120 (czerwony)', 2),
  (12, 4, 'stick', 'Patyczek', 3),
  (13, 5, 'chocolate', 'Czekolada mleczna', 1),
  (14, 5, 'dye', 'Barwnik: E160c (pomarańczowy)', 2),
  (15, 6, 'chocolate', 'Czekolada mleczna', 1),
  (16, 7, 'chocolate', 'Czekolada mleczna', 1),
  (17, 7, 'dye', 'Barwnik: E100 (żółty)', 2),
  (18, 8, 'chocolate', 'Czekolada mleczna', 1),
  (19, 9, 'chocolate', 'Czekolada biała', 1),
  (20, 10, 'chocolate', 'Czekolada gorzka', 1);

SELECT setval(pg_get_serial_sequence('operators', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM operators;
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM categories;
SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM products;
SELECT setval(pg_get_serial_sequence('recipe_items', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM recipe_items;
SELECT setval(pg_get_serial_sequence('ingredients', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ingredients;
SELECT setval(pg_get_serial_sequence('sessions', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM sessions;
SELECT setval(pg_get_serial_sequence('measurements', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM measurements;
