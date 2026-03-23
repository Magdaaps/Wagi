const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\MonikaBrawiak\\Documents\\Wagi\\backend\\data.json', 'utf8'));
console.log(data.categories);
