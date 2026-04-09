import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api';
import SessionsList from './SessionsList';
import Dashboard from './Dashboard';
import ExportPage from './ExportPage';
import ProductsList from './ProductsList';
import OperatorsList from './OperatorsList';
import IngredientsList from './IngredientsList';

export default function AdminApp() {
  const [auth, setAuth] = useState(() => localStorage.getItem('adminAuth') === 'true');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState('');
  const [settingsNewUsername, setSettingsNewUsername] = useState('');
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    api.login(username, password)
      .then(() => {
        setAuth(true);
        localStorage.setItem('adminAuth', 'true');
      })
      .catch(() => setError('Nieprawidłowe dane logowania'));
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    setAuth(false);
    navigate('/admin');
  };

  const resetSettingsForm = () => {
    setSettingsCurrentPassword('');
    setSettingsNewUsername('');
    setSettingsNewPassword('');
    setSettingsConfirmPassword('');
    setSettingsError('');
    setSettingsSuccess('');
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    resetSettingsForm();
  };

  const handleSaveSettings = async () => {
    setSettingsError('');
    setSettingsSuccess('');

    if (settingsNewPassword && settingsNewPassword !== settingsConfirmPassword) {
      setSettingsError('Nowe hasła nie są zgodne');
      return;
    }

    try {
      await api.updateSettings(
        settingsCurrentPassword,
        settingsNewUsername || undefined,
        settingsNewPassword || undefined
      );
      setSettingsSuccess('Ustawienia zapisane pomyślnie');
      window.setTimeout(() => {
        resetSettingsForm();
        setShowSettings(false);
      }, 1500);
    } catch (err) {
      setSettingsError(err.message);
    }
  };

  if (!auth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5efe6' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: '3rem', borderRadius: '12px', width: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <h2 className="text-center mb-4" style={{ color: 'var(--choc-dark)' }}>Panel Admina</h2>
          {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Login</label>
            <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Hasło</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Zaloguj</button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="admin-layout">
        <div className="admin-sidebar">
          <div className="admin-brand">Wagi Adikam</div>
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>Sesje ważeń</NavLink>
          <NavLink to="/admin/products" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>Produkty</NavLink>
          <NavLink to="/admin/raw-materials" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>Surowce</NavLink>
          <NavLink to="/admin/operators" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>Pracownicy</NavLink>
          <NavLink to="/admin/dashboard" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
          <NavLink to="/admin/export" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>Raporty / Eksport</NavLink>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowSettings(true)} className="admin-nav-item" style={{ background: 'none', border: 'none', textAlign: 'left', width: 'auto', cursor: 'pointer' }}>Ustawienia</button>
            <button onClick={handleLogout} className="admin-nav-item" style={{ background: 'none', border: 'none', textAlign: 'left', width: 'auto', cursor: 'pointer' }}>Wyloguj</button>
          </div>
        </div>
        <div className="admin-content">
          <Routes>
            <Route path="/" element={<SessionsList />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/raw-materials" element={<IngredientsList />} />
            <Route path="/operators" element={<OperatorsList />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </div>
      </div>

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>Ustawienia konta</h3>
            <div className="form-group">
              <label className="form-label">Aktualne hasło</label>
              <input
                type="password"
                className="form-control"
                value={settingsCurrentPassword}
                onChange={e => setSettingsCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nowa nazwa użytkownika</label>
              <input
                type="text"
                className="form-control"
                value={settingsNewUsername}
                onChange={e => setSettingsNewUsername(e.target.value)}
                placeholder="Pozostaw puste, aby nie zmieniać"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nowe hasło</label>
              <input
                type="password"
                className="form-control"
                value={settingsNewPassword}
                onChange={e => setSettingsNewPassword(e.target.value)}
                placeholder="Pozostaw puste, aby nie zmieniać"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Potwierdź nowe hasło</label>
              <input
                type="password"
                className="form-control"
                value={settingsConfirmPassword}
                onChange={e => setSettingsConfirmPassword(e.target.value)}
              />
            </div>
            {settingsError && <div style={{ color: 'red', marginBottom: '1rem' }}>{settingsError}</div>}
            {settingsSuccess && <div style={{ color: 'green', marginBottom: '1rem' }}>{settingsSuccess}</div>}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={handleSaveSettings}>Zapisz</button>
              <button type="button" className="btn" onClick={handleCloseSettings}>Anuluj</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
