import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TabletApp from './tablet/TabletApp';
import AdminApp from './admin/AdminApp';

function App() {
  return (
    <Routes>
      <Route path="/tablet/*" element={<TabletApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/tablet" replace />} />
    </Routes>
  );
}

export default App;
