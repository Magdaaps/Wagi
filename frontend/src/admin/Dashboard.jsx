import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '../api';
import Filters from './Filters';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [operators, setOperators] = useState([]);

  useEffect(() => {
    api.getCategories().then(setCategories);
    api.getProducts().then(setProducts);
    api.getOperators().then(setOperators);
  }, []);

  useEffect(() => {
    api.getSessions({ ...filters, status: 'completed' }).then(setSessions);
  }, [filters]);

  // 1. Trend średniej wagi
  const trendData = sessions.slice().reverse().map(s => ({
    name: `${s.date_weighing} ${s.start_time}`,
    avg: s.avg_weight_g,
    dekl: s.declared_weight_g,
    product: s.product_name,
  }));

  // 2. Zużycie czekolady
  const usageMap = {};
  sessions.forEach(s => {
    const k = filters.product_id ? s.date_weighing : s.product_name;
    usageMap[k] = (usageMap[k] || 0) + s.total_chocolate_kg;
  });
  const usageData = Object.entries(usageMap).map(([name, kg]) => ({ name, kg: +kg.toFixed(2) }));

  // 3. Nadlewy/niedolewy (Suma różnic kg)
  const diffMap = {};
  sessions.forEach(s => {
    const k = s.product_name;
    diffMap[k] = (diffMap[k] || 0) + s.sum_diff_kg;
  });
  const diffData = Object.entries(diffMap).map(([name, kg]) => ({ name, diff: +kg.toFixed(3) })).sort((a,b) => b.diff - a.diff);

  const CustomTooltipTrend = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '1rem', border: '1px solid #ccc' }}>
          <p>{payload[0].payload.product}</p>
          <p>{label}</p>
          <p style={{ color: '#8884d8' }}>Średnia: {payload[0].value}g</p>
          <p style={{ color: '#82ca9d' }}>Deklarowana: {payload[1].value}g</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>
      <Filters filters={filters} onChange={setFilters} categories={categories} products={products} operators={operators} />

      {sessions.length === 0 ? <p className="text-center mt-4">Brak danych dla wybranego filtru.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Wykres 1: Trend średniej wagi (1 sztuki)</h3>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltipTrend />} />
                  <Legend />
                  <Line type="monotone" dataKey="avg" name="Średnia waga (g)" stroke="#d4af37" strokeWidth={3} dot={{r:4}} />
                  <Line type="step" dataKey="dekl" name="Deklarowana waga (g)" stroke="#2a1b18" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted text-center mt-2" style={{ fontSize: '0.9rem' }}>Osie X = kolejne sesje w czasie. Pozwala wykryć uciekanie procesu od normy.</p>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Wykres 2: Zużycie czekolady</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(val) => `${val} kg`} />
                  <Legend />
                  <Bar dataKey="kg" name="Zużycie (kg)" fill="#8b5a2b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Wykres 3: Nadlewy / Niedolewy (Skrzynki)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diffData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(val) => `${val} kg`} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="diff" name="Różnica od normy (kg)">
                    {
                      diffData.map((entry, index) => (
                        <cell key={`cell-${index}`} fill={entry.diff > 0 ? '#c62828' : '#2e7d32'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted text-center mt-2" style={{ fontSize: '0.9rem' }}>Czerwone słupki w górę = strata czekolady na nadlew. Zielone w dół = niedolewy (zysk z masy/problem jakościowy).</p>
          </div>

        </div>
      )}
    </div>
  );
}
