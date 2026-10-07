// Yerel önizleme sunucusu: node onizle.js → http://localhost:8765
const http = require('http'), fs = require('fs'), path = require('path');
http.createServer((q, s) => {
  const yol = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(__dirname, yol === '/' ? 'index.html' : yol);
  fs.readFile(f, (e, d) => {
    if (e) { s.writeHead(404); return s.end(); }
    const html = f.endsWith('.html');
    s.writeHead(200, { 'Content-Type': html ? 'text/html; charset=utf-8' : 'application/json' });
    s.end(html ? '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">' + d : d);
  });
}).listen(8765);
