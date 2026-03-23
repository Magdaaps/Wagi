const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('produkty.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  // Check column C (index 2 = "Zdjęcie") for non-empty values
  let imageCount = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[2] !== undefined && row[2] !== null && String(row[2]).trim() !== '') {
      console.log(`Row ${i}: Zdjęcie = ${row[2]}`);
      imageCount++;
    }
  }
  console.log(`\nTotal rows with image data: ${imageCount}`);
  console.log(`Total rows: ${data.length}`);

  // Check for images in the workbook
  console.log('\n--- Workbook keys ---');
  console.log(Object.keys(workbook));
  
  if (workbook.Sheets[sheetName]['!images']) {
    console.log('Found !images in worksheet');
    console.log(workbook.Sheets[sheetName]['!images']);
  }
  if (workbook.Sheets[sheetName]['!drawings']) {
    console.log('Found !drawings in worksheet');
  }

  // Check for media
  if (workbook['!media']) {
    console.log('Found media:', workbook['!media'].length, 'items');
  }
  if (workbook['!drawings']) {
    console.log('Found drawings');
  }

  // List all special sheet keys
  const ws = workbook.Sheets[sheetName];
  const specialKeys = Object.keys(ws).filter(k => k.startsWith('!'));
  console.log('\nSpecial worksheet keys:', specialKeys);

} catch (e) {
  console.error("Error:", e);
}
