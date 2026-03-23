const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. Rename Czekolady to Tabliczki
data.categories = data.categories.map(c => {
  if (c.name === 'Czekolady') return { ...c, name: 'Tabliczki' };
  return c;
});

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Zmieniono nazwę kategorii na "Tabliczki".');
