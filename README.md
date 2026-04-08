# Wagi

System do rejestrowania pomiarow wagi wyrobow czekoladowych z widokiem `tablet` i panelem `admin`.

## Architektura

- `frontend/`: React + Vite, jeden deployment na Vercelu
- `backend/`: Express API na Renderze
- `Supabase`: Postgres + Storage na zdjecia produktow

Docelowe linki:

- `https://twoj-frontend.vercel.app/tablet`
- `https://twoj-frontend.vercel.app/admin`

## Lokalnie

### Backend

```bash
cd backend
copy .env.example .env
npm install
npm start
```

### Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Frontend lokalnie dziala pod `http://localhost:4174`.

## Supabase

1. Utworz projekt w Supabase.
2. Otworz SQL Editor i uruchom zawartosc pliku [supabase_schema.sql](/c:/Users/MonikaBrawiak/Documents/Wagi/supabase_schema.sql).
3. Uzupelnij `backend/.env` danymi `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`.
4. Opcjonalnie ustaw `ADMIN_USERNAME`, `ADMIN_PASSWORD` i `SUPABASE_STORAGE_BUCKET`.
5. Jezeli chcesz przeniesc obecne dane z lokalnego pliku `backend/data.json`, uruchom:

```bash
cd backend
npm run migrate:supabase
```

Skrypt migracji przenosi:

- operatorow
- kategorie
- produkty
- skladniki receptur
- liste skladnikow
- sesje i pomiary
- zdjecia z `backend/uploads/` do Supabase Storage
- konto administratora do tabeli `admin_credentials`

## Render

Repo zawiera plik [render.yaml](/c:/Users/MonikaBrawiak/Documents/Wagi/render.yaml), wiec mozesz utworzyc backend jako Blueprint albo zwykly Web Service.

Wymagane zmienne:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Opcjonalne:

- `SUPABASE_STORAGE_BUCKET` (domyslnie `product-images`)

## Vercel

Frontend to jeden projekt Vite w folderze `frontend/`.

Ustaw:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Env: `VITE_API_URL=https://twoj-backend.onrender.com`

Plik [frontend/vercel.json](/c:/Users/MonikaBrawiak/Documents/Wagi/frontend/vercel.json) dodaje rewrite dla SPA, zeby dzialaly bezposrednie wejscia na `/tablet` i `/admin`.

## Bezpieczenstwo

- Nie commituj prawdziwych kluczy Supabase do repo.
- `SUPABASE_SERVICE_ROLE_KEY` powinien byc ustawiony tylko w backendzie Render.
- Po wdrozeniu warto ustawic w Supabase rotacje klucza, jesli byl kiedykolwiek zapisany lokalnie w `backend/.env`.
