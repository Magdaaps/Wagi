import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Filters from './Filters';

export default function ExportPage() {
  const [filters, setFilters] = useState({});
  const [reportType, setReportType] = useState('general');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [operators, setOperators] = useState([]);

  useEffect(() => {
    api.getCategories().then(setCategories);
    api.getProducts().then(setProducts);
    api.getOperators().then(setOperators);
  }, []);

  const handleExport = () => {
    const params = { ...filters, report_type: reportType };
    const url = api.exportUrl(params);
    window.open(url, '_blank');
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Raporty i Eksport</h1>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--choc-light)' }}>Krok 1: Wybierz filtry (Opcjonalnie)</h3>
        <Filters filters={filters} onChange={setFilters} categories={categories} products={products} operators={operators} />
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--choc-light)' }}>Krok 2: Wybierz typ raportu</h3>
        
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1.1rem' }}>
            <input 
              type="radio" 
              name="reportType" 
              value="general" 
              checked={reportType === 'general'} 
              onChange={() => setReportType('general')}
              style={{ width: '20px', height: '20px' }}
            />
            Raport Zbiorczy (Wszystkie sesje w głównej tabeli)
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '1.1rem' }}>
            <input 
              type="radio" 
              name="reportType" 
              value="detailed" 
              checked={reportType === 'detailed'} 
              onChange={() => setReportType('detailed')}
              style={{ width: '20px', height: '20px' }}
            />
            Raport Szczegółowy (Dla każdej sesji osobny arkusz / zakładka)
          </label>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ fontSize: '1.2rem', padding: '1rem 2rem', fontWeight: 'bold' }} 
          onClick={handleExport}
        >
          ⬇️ Generuj i Pobierz (XLSX)
        </button>
      </div>
      
      <div style={{ padding: '1.5rem', background: '#e3f2fd', borderRadius: '8px', borderLeft: '5px solid #1976d2' }}>
        <p style={{ margin: 0, color: '#0d47a1', fontSize: '0.95rem' }}>
          <strong>Wskazówka:</strong> Eksportowane są wyłącznie zakończone sesje ważeń. Filtry zadeklarowane powyżej zostaną uwzględnione w wygenerowanym pliku Excela.
        </p>
      </div>

    </div>
  );
}
