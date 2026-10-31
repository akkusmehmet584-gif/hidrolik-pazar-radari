// GitHub Pages için yayın klasörünü (site/) hazırlar: index.html tam belgeye sarılır, veri dosyaları kopyalanır.
const fs = require('fs');
const path = require('path');
const kok = __dirname, hedef = path.join(kok, 'site');
fs.mkdirSync(hedef, { recursive: true });
const govde = fs.readFileSync(path.join(kok, 'index.html'), 'utf8');
const belge = '<!doctype html><html lang="tr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<style>:root{color-scheme:light dark}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>' +
  '</head><body>' + govde + '</body></html>';
fs.writeFileSync(path.join(hedef, 'index.html'), belge);
for (const f of ['veri.json', 'ozet.json']) if (fs.existsSync(path.join(kok, f))) fs.copyFileSync(path.join(kok, f), path.join(hedef, f));
// Bileşen deposu ikizi aynı sitede /depo-ikizi/ altında yayınlanır (tek dosya, kendi içinde tam belge)
const depo = path.join(kok, 'depo-ikizi', 'index.html');
if (fs.existsSync(depo)) { fs.mkdirSync(path.join(hedef, 'depo-ikizi'), { recursive: true }); fs.copyFileSync(depo, path.join(hedef, 'depo-ikizi', 'index.html')); }
fs.writeFileSync(path.join(hedef, '.nojekyll'), '');
console.log('site/ hazır');
