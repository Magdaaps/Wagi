create table if not exists operators (
  id bigserial primary key,
  name text not null
);

create table if not exists categories (
  id bigserial primary key,
  name text not null
);

create table if not exists products (
  id bigserial primary key,
  name text not null,
  ean text,
  category_id bigint references categories(id) on delete set null,
  declared_weight_g numeric(10, 2),
  tolerance_g numeric(10, 2) not null default 0,
  image_path text
);

create table if not exists recipe_items (
  id bigserial primary key,
  product_id bigint not null references products(id) on delete cascade,
  ingredient_type text not null,
  label text not null,
  sort_order integer not null default 1
);

create table if not exists ingredients (
  id bigserial primary key,
  label text not null unique,
  category text not null default 'Dodatki'
);

create table if not exists sessions (
  id bigserial primary key,
  category_id bigint references categories(id) on delete set null,
  product_id bigint references products(id) on delete set null,
  batch_numbers jsonb not null default '{}'::jsonb,
  date_weighing date,
  start_time time,
  end_time time,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists session_operators (
  session_id bigint not null references sessions(id) on delete cascade,
  operator_id bigint not null references operators(id) on delete cascade,
  primary key (session_id, operator_id)
);

create table if not exists measurements (
  id bigserial primary key,
  session_id bigint not null references sessions(id) on delete cascade,
  seq integer not null,
  box_number text,
  empty_box_weight_kg numeric(10, 3) not null,
  full_box_weight_kg numeric(10, 3) not null,
  piece_count integer not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_credentials (
  id integer primary key,
  username text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_recipe_items_product_id on recipe_items(product_id);
create index if not exists idx_sessions_category_id on sessions(category_id);
create index if not exists idx_sessions_product_id on sessions(product_id);
create index if not exists idx_session_operators_operator_id on session_operators(operator_id);
create index if not exists idx_measurements_session_id on measurements(session_id);
create unique index if not exists idx_categories_name_unique on categories(name);
create unique index if not exists idx_operators_name_unique on operators(name);
