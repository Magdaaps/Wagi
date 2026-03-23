// Script to extract weights from product names and update declared_weight_g in data.json
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let updated = 0;
data.products.forEach(p => {
  // Match patterns like "20 g", "90g", "100 g", "230 g"
  const match = p.name.match(/(\d+)\s*g\b/i);
  if (match) {
    p.declared_weight_g = parseInt(match[1], 10);
    updated++;
  }
});

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Updated weights for ${updated} out of ${data.products.length} products.`);

// Show a sample
data.products.slice(0, 5).forEach(p => {
  console.log(`  [${p.id}] ${p.name} → ${p.declared_weight_g} g`);
});
