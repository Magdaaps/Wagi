const http = require('http');

http.get('http://localhost:3001/api/products', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const products = JSON.parse(body);
    let updated = 0;
    
    products.forEach(p => {
      const data = JSON.stringify({ declared_weight_g: p.declared_weight_g });
      
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/products/${p.id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, (resp) => {
        resp.on('data', () => {});
        resp.on('end', () => {
          updated++;
          if (updated === products.length) {
            console.log(`✅ Updated tolerance for all ${products.length} products via API.`);
          }
        });
      });
      req.write(data);
      req.end();
    });
  });
});
