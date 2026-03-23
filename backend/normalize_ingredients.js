// Normalize recipe_items labels: First letter uppercase, rest lowercase
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

function capitalize(str) {
  str = str.trim();
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

let changed = 0;
data.recipe_items.forEach(r => {
  const original = r.label;
  r.label = capitalize(r.label);
  if (original !== r.label) {
    changed++;
  }
});

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Znormalizowano ${changed} składowych z ${data.recipe_items.length} łącznie.`);

// Show unique labels
const unique = [...new Set(data.recipe_items.map(r => r.label))].sort();
console.log(`\nUnikalne składowe (${unique.length}):`);
unique.forEach(l => console.log(`  - ${l}`));
