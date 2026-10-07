// Günlük yorumu yazacak olan Claude için veri.json'dan kısa bir özet çıkarır.
// Çalıştırma: node ozet-girdi.js
const d = require('./veri.json');
const f = (v, n = 1) => v == null ? '–' : (+v).toFixed(n);
console.log(`VERİ TARİHİ: ${d.guncelleme}`);
console.log('\nBÖLGE NABIZLARI (skor, 3 ay önce, evre, güven, iyileşen/toplam):');
for (const [k, n] of Object.entries(d.nabiz)) console.log(`- ${k}: ${f(n.skor, 2)} (3 ay önce ${f(n.skor3AyOnce, 2)}) ${n.evre} / güven ${n.guven} / ${n.iyilesenSayi}/${n.toplamSayi} | iyileşen: ${(n.iyilesenler || []).join('; ')} | kötüleşen: ${(n.kotulesenler || []).join('; ')}`);
const talep = d.gostergeler.filter(g => g.yon && g.z != null).sort((a, b) => b.z - a.z);
const sat = g => `${g.ad} [${g.bolge}, ${g.tarih}]: yıllık ${f(g.yoy3)}%, sapma ${f(g.z)}`;
console.log('\nEN GÜÇLÜ 6 TALEP GÖSTERGESİ:'); talep.slice(0, 6).forEach(g => console.log('- ' + sat(g)));
console.log('\nEN ZAYIF 6 TALEP GÖSTERGESİ:'); talep.slice(-6).reverse().forEach(g => console.log('- ' + sat(g)));
console.log('\nMALİYET VE LOJİSTİK (yıllık değişim):');
d.gostergeler.filter(g => !g.yon).forEach(g => console.log(`- ${g.ad}: ${g.son} ${g.birim} (${g.tarih}), yıllık ${f(g.yoy3)}%`));
console.log('\nBORSA GRUP ENDEKSLERİ (son / 13 hafta önce):');
for (const [k, v] of Object.entries(d.hisseler.gruplar)) console.log(`- ${k}: ${v.at(-1)?.[1]} / ${v.at(-14)?.[1]}`);
const haber = b => { const g = {}; d.haberler.filter(h => (h.bolum || 'pazar') === b).forEach(h => (g[h.konu] = g[h.konu] || []).push(h)); return g; };
for (const [baslik, b] of [['PAZAR HABERLERİ', 'pazar'], ['ÜRETİM TEKNOLOJİSİ HABERLERİ', 'uretim']]) {
  console.log(`\n${baslik} (konu başına en yeni 6):`);
  for (const [k, l] of Object.entries(haber(b))) { console.log(`* ${k}`); l.slice(0, 6).forEach(h => console.log(`  - ${h.tarih.slice(0, 10)} ${h.baslik} (${h.kaynak})`)); }
}
if (d.hatalar?.length) console.log('\nTOPLAMA HATALARI:\n- ' + d.hatalar.join('\n- '));
