// Günün yorumunu veri.json'dan kural tabanlı olarak üretir (yapay zekâ API'si gerekmez).
// Çalıştırma: node yorum.js  → ozet.json
const fs = require('fs');
const path = require('path');
const d = require('./veri.json');

const f = (v, n = 1) => (v == null || !isFinite(v)) ? '–' : (+v).toLocaleString('tr-TR', { minimumFractionDigits: n, maximumFractionDigits: n });
const isaret = v => v > 0 ? '+' : '';
const BOLGE = { dunya: 'Dünya', amerika: 'Amerika', avrupa: 'Avrupa', asya: 'Asya', turkiye: 'Türkiye' };
const EVRE_YON = { 'Genişleme': 'büyüme bölgesinde', 'Yavaşlama': 'olağanın üzerinde ama ivme kaybediyor', 'Toparlanma': 'olağanın altında ama yukarı dönüyor', 'Daralma': 'olağanın altında ve zayıflıyor' };

function bolgeCumlesi(k) {
  const n = d.nabiz[k]; if (!n || n.skor == null) return '';
  return `${BOLGE[k]} talebi ${EVRE_YON[n.evre] || ''} (nabız ${isaret(n.skor)}${f(n.skor, 2)}, 3 ay önce ${isaret(n.skor3AyOnce)}${f(n.skor3AyOnce, 2)}; ${n.iyilesenSayi}/${n.toplamSayi} gösterge iyileşiyor, güven ${n.guven.toLowerCase()}).`;
}

// Pazar paragrafı
const talep = d.gostergeler.filter(g => g.yon && g.z != null && g.kaynak !== 'oecd_cli');
const guclu = [...talep].sort((a, b) => b.z - a.z).slice(0, 2);
const zayif = [...talep].sort((a, b) => a.z - b.z).slice(0, 2);
const tr = d.nabiz.turkiye;
const pazar = [
  bolgeCumlesi('dunya'),
  d.nabiz.dunya?.cumle || '',
  `Normalden en güçlü seyredenler: ${guclu.map(g => `${g.ad} (yıllık ${isaret(g.yoy3)}${f(g.yoy3)}%)`).join(', ')}. En zayıflar: ${zayif.map(g => `${g.ad} (yıllık ${isaret(g.yoy3)}${f(g.yoy3)}%)`).join(', ')}.`,
  ['avrupa', 'amerika', 'asya'].map(bolgeCumlesi).join(' '),
  bolgeCumlesi('turkiye'),
  tr?.cumle ? `Türkiye için: ${tr.cumle}` : '',
  tr?.iyilesenler?.length ? `Türkiye'de iyileşenler: ${tr.iyilesenler.join(', ')}.` : '',
  tr?.kotulesenler?.length ? `Kötüleşenler: ${tr.kotulesenler.join(', ')}.` : '',
].filter(Boolean).join(' ');

// Dikkat edilecekler: yıllık değişimi %10'u aşan maliyet/lojistik kalemleri + borsa grupları
const dikkat = [];
const maliyet = d.gostergeler.filter(g => (g.katman === 'maliyet' || g.katman === 'lojistik') && g.yoy3 != null && Math.abs(g.yoy3) >= 10)
  .sort((a, b) => Math.abs(b.yoy3) - Math.abs(a.yoy3)).slice(0, 5);
for (const g of maliyet) dikkat.push(`${g.ad}: son 3 ayda geçen yılın aynı dönemine göre ${isaret(g.yoy3)}${f(g.yoy3)}% (${g.katman === 'lojistik' ? 'lojistik' : 'maliyet'} ${g.yoy3 > 0 ? 'baskısı artıyor' : 'baskısı azalıyor'}).`);
const sat = d.gostergeler.find(g => g.kod === 'PCU333995333995'), ce = d.gostergeler.find(g => g.kod === 'WPU101');
if (sat?.yoy3 != null && ce?.yoy3 != null && ce.yoy3 - sat.yoy3 > 5) dikkat.push(`Çelik fiyatları yıllık ${isaret(ce.yoy3)}${f(ce.yoy3)}% artarken hidrolik silindir satış fiyatları ${isaret(sat.yoy3)}${f(sat.yoy3)}% artmış: üretici marjları sıkışıyor olabilir.`);
const GRUP = { bilesen: 'Hidrolik bileşen üreticileri', oem: 'Makine üreticileri', uretim: 'Tezgah/takım/otomasyon şirketleri', tr: 'Türk şirketleri' };
for (const [k, v] of Object.entries(d.hisseler?.gruplar || {})) {
  const son = v.at(-1)?.[1], once = v.at(-14)?.[1]; if (!son || !once) continue;
  const deg = (son / once - 1) * 100; if (Math.abs(deg) >= 8) dikkat.push(`${GRUP[k]} hisseleri son 3 ayda ortalama ${isaret(deg)}${f(deg)}% (yatırımcı beklentisi ${deg > 0 ? 'iyileşiyor' : 'kötüleşiyor'}).`);
}

// Teknoloji gündemi: üretim haberlerinden her konunun en yeni, reklam olmayan başlığı
const REKLAM = /openPR|market (size|growth|report|forecast)|CAGR|Market to Grow|Market Driven/i;
const teknoloji = [];
const konular = [...new Set(d.haberler.filter(h => h.bolum === 'uretim').map(h => h.konu))];
for (const k of konular) {
  const l = d.haberler.filter(h => h.bolum === 'uretim' && h.konu === k && !REKLAM.test(h.baslik + ' ' + h.kaynak)).slice(0, 2);
  for (const h of l) teknoloji.push(`${k}: ${h.baslik} (${h.kaynak}, ${h.tarih.slice(0, 10)})`);
}

const ozet = { tarih: d.guncelleme.slice(0, 10), otomatik: true, pazar, dikkat: dikkat.slice(0, 7), teknoloji: teknoloji.slice(0, 10) };
fs.writeFileSync(path.join(__dirname, 'ozet.json'), JSON.stringify(ozet, null, 2));
console.log('ozet.json yazıldı:', ozet.dikkat.length, 'dikkat,', ozet.teknoloji.length, 'teknoloji maddesi');
