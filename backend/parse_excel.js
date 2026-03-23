const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('produkty.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  console.log("SheetName: " + sheetName);
  console.log("First 5 rows:");
  for (let i = 0; i < Math.min(5, data.length); i++) {
    console.log(data[i]);
  }
} catch (e) {
  console.error("Error reading file:", e);
}
