const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
let dbData = {};

try {
  if (fs.existsSync(dbPath)) {
    dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } else {
    // Basic structure if data.json somehow isn't there
    dbData = { products: [], recipe_items: [], sessions: [], measurements: [] };
  }
} catch (e) {
  console.error("Error loading data.json", e);
  process.exit(1);
}

try {
  const workbook = xlsx.readFile('produkty.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  const products = [];
  const recipe_items = [];
  let currentProductId = 1;
  let currentRecipeItemId = 1;

  let currentProduct = null;
  let recipeSortOrder = 1;

  // Assuming header is on row 0, data starts at row 1
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const nazwa = row[0];
    const ean = row[1];
    const zdjecie = row[2];
    const surowiec = row[3];

    // If 'nazwa' is present, it's a new product
    if (nazwa !== undefined && nazwa !== null && String(nazwa).trim() !== '') {
      currentProduct = {
        id: currentProductId++,
        name: String(nazwa).trim(),
        ean: ean ? String(ean).trim() : null,
        imageUrl: zdjecie ? String(zdjecie).trim() : null, // Assuming URL or path
        category_id: 3, // Defaulting to some category, maybe Czekolady
        declared_weight_g: 100, // Default for now
        tolerance_g: 5
      };
      products.push(currentProduct);
      recipeSortOrder = 1;
    }

    // Add ingredient if present
    if (surowiec !== undefined && surowiec !== null && String(surowiec).trim() !== '' && currentProduct) {
      recipe_items.push({
        id: currentRecipeItemId++,
        product_id: currentProduct.id,
        ingredient_type: 'ingredient', // generic
        label: String(surowiec).trim(),
        sort_order: recipeSortOrder++
      });
    }
  }

  // Update DB
  dbData.products = products;
  dbData.recipe_items = recipe_items;
  
  // Also make sure _seq is updated
  if(!dbData._seq) dbData._seq = {};
  dbData._seq.products = currentProductId;
  dbData._seq.recipe_items = currentRecipeItemId;

  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
  console.log(`✅ Successfully imported ${products.length} products and ${recipe_items.length} ingredients.`);
} catch (e) {
  console.error("Error processing Excel:", e);
}
