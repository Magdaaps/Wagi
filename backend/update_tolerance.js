const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

function calculateTolerance(w) {
  if (w <= 0) return 0;
  if (w <= 50) return parseFloat((w * 0.09).toFixed(1));
  if (w <= 100) return 4.5;
  if (w <= 200) return parseFloat((w * 0.045).toFixed(1));
  if (w <= 300) return 9;
  if (w <= 500) return parseFloat((w * 0.03).toFixed(1));
  return parseFloat((w * 0.03).toFixed(1)); // default to 3% if > 500
}

db.products = db.products.map(p => {
  const t = calculateTolerance(p.declared_weight_g);
  return { ...p, tolerance_g: t };
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(`✅ Updated tolerance for ${db.products.length} products.`);
