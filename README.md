# Wagi - System Ważenia Wyrobów Czekoladowych

System do rejestrowania pomiarów wagi produktów czekoladowych (lizaków, figurek itp.) z automatycznym wyliczaniem tolerancji.

## Struktura projektu
- `/backend`: Serwer Express.js obsługujący dane w formacie JSON (`data.json`).
- `/frontend`: Aplikacja React (Vite) z widokami dla tabletu oraz panelu administratora.

## Uruchamianie
### Backend
```bash
cd backend
npm install
npm run start (lub node server.js)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Funkcje
- Wybór operatora i produktu.
- Podawanie numerów partii z obsługą firm (dropdown dla czekolad i polew).
- Automatyczne sprawdzanie tolerancji wagowej.
- Raporty Excel i Dashboard.
