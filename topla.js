// Hidrolik Pazar Radarı — veri toplayıcı
// Çalıştırma:  node topla.js        → veri.json üretir
// Giriş/şifre/API anahtarı gerektirmeyen açık kaynaklar kullanılır.
const fs = require('fs');
const path = require('path');
const { GOSTERGELER, HISSELER, SEC_SIRKETLER, GTIP, HABER, RSS } = require('./kaynaklar');

const UA = 'Mozilla/5.0 (HorizonEndustri pazar radari; akkusmehmet584@gmail.com)';
const BASLANGIC_YIL = 2010;
const hatalar = [];
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function getir(url, { tip = 'text', deneme = 3, gecikme = 4000, headers = {} } = {}) {
  for (let i = 1; i <= deneme; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(45000) });
      const t = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 120)}`);
      if (tip === 'json') return JSON.parse(t);
      if (tip === 'csv' && /^\s*</.test(t)) throw new Error('CSV yerine HTML döndü (bot koruması)');
      return t;
    } catch (e) {
      if (i === deneme) throw e;
      await bekle(gecikme * i);
    }
  }
}

// ---------- Seri yardımcıları ----------
const ortalama = a => a.reduce((s, x) => s + x, 0) / a.length;
const stdSapma = a => { const m = ortalama(a); return Math.sqrt(ortalama(a.map(x => (x - m) ** 2))); };
const yuvarla = (x, d = 2) => (x == null || !isFinite(x)) ? null : Math.round(x * 10 ** d) / 10 ** d;

// [[YYYY-MM, değer]] aylık seriye çevirir (günlükse ay ortalaması)
function aylikla(noktalar) {
  const ay = {};
  for (const [t, v] of noktalar) { if (v == null || !isFinite(v)) continue; const k = t.slice(0, 7); (ay[k] = ay[k] || []).push(v); }
  return Object.keys(ay).sort().map(k => [k, ortalama(ay[k])]);
}

function analiz(seri, { periyot = 12, cliMi = false } = {}) {
  // seri: [[t, v]] artan sırada; periyot: 12 aylık, 4 çeyreklik
  const n = seri.length;
  if (n < periyot + 3) return null;
  const v = seri.map(x => x[1]);
  const pencere = periyot === 12 ? 3 : 1;
  const yoyAt = i => (i - periyot < 0 || !v[i - periyot]) ? null : (v[i] / v[i - periyot] - 1) * 100;
  const yoy3At = i => {
    if (i - periyot - pencere + 1 < 0) return null;
    const a = ortalama(v.slice(i - pencere + 1, i + 1)), b = ortalama(v.slice(i - periyot - pencere + 1, i - periyot + 1));
    return b ? (a / b - 1) * 100 : null;
  };
  // sinyal: CLI için seviye (100 = trend), diğerleri için 3 dönemlik yıllık değişim
  const sinyal = seri.map((_, i) => cliMi ? v[i] - 100 : yoy3At(i));
  const gecerli = sinyal.filter(x => x != null);
  const m = ortalama(gecerli), s = stdSapma(gecerli) || 1;
  const zSeri = seri.map(([t], i) => [t, sinyal[i] == null ? null : (sinyal[i] - m) / s]);
  const son = n - 1;
  const trend3 = n >= 6 ? (ortalama(v.slice(n - 3)) / ortalama(v.slice(n - 6, n - 3)) - 1) * 100 : null;
  return {
    son: yuvarla(v[son], 3), tarih: seri[son][0],
    yoy: yuvarla(yoyAt(son)), yoy3: yuvarla(yoy3At(son)), trend3: yuvarla(trend3),
    cliDegisim6: cliMi && n > 6 ? yuvarla(v[son] - v[son - 6]) : null,
    z: yuvarla(zSeri[son][1]),
    zSeri: zSeri.filter(x => x[1] != null).map(([t, z]) => [t, yuvarla(z)]),
  };
}

// ---------- Kaynaklar ----------
async function fredSeri(kod) {
  const csv = await getir(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${kod}&cosd=${BASLANGIC_YIL}-01-01`, { tip: 'csv' });
  const satirlar = csv.trim().split(/\r?\n/).slice(1).map(l => l.split(','));
  return aylikla(satirlar.map(([t, v]) => [t, v === '.' || v === '' ? null : +v]));
}

async function eurostatSeri(veri, filtre, ceyreklik) {
  const q = new URLSearchParams({ ...filtre, sinceTimePeriod: ceyreklik ? `${BASLANGIC_YIL}-Q1` : `${BASLANGIC_YIL}-01` });
  const j = await getir(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${veri}?${q}`, { tip: 'json' });
  const zaman = j.dimension.time.category.index; // {"2026-01": 0, ...}
  const boyut = j.size, sira = j.id;
  // diğer tüm boyutlar tek değerli olmalı; zaman boyutunun adımını bul
  let adim = 1; for (let k = sira.length - 1; k > sira.indexOf('time'); k--) adim *= boyut[k];
  return Object.entries(zaman).map(([t, i]) => [t, j.value[i * adim] ?? null]).filter(x => x[1] != null)
    .sort((a, b) => a[0] < b[0] ? -1 : 1);
}

async function oecdCli(ulkeler) {
  const url = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI,4.1/${ulkeler.join('+')}.M.LI...AA...H?startPeriod=${BASLANGIC_YIL}-01&format=csvfilewithlabels`;
  const csv = await getir(url, { tip: 'csv', deneme: 5, gecikme: 8000 });
  const sat = csv.trim().split(/\r?\n/).map(l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, '').replace(/^"|"$/g, '')));
  const h = sat[0], iU = h.indexOf('REF_AREA'), iT = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE');
  const sonuc = {};
  for (const r of sat.slice(1)) { if (!r[iV]) continue; (sonuc[r[iU]] = sonuc[r[iU]] || []).push([r[iT], +r[iV]]); }
  for (const k in sonuc) sonuc[k].sort((a, b) => a[0] < b[0] ? -1 : 1);
  return sonuc;
}

async function gostergeleriTopla() {
  const cliUlkeler = GOSTERGELER.filter(g => g.kaynak === 'oecd_cli').map(g => g.kod);
  let cli = {};
  try { cli = await oecdCli(cliUlkeler); } catch (e) { hatalar.push(`OECD öncü göstergeler: ${e.message}`); }
  const sonuc = [];
  for (const g of GOSTERGELER) {
    try {
      let seri, periyot = 12;
      if (g.kaynak === 'fred') { seri = await fredSeri(g.kod); await bekle(1500); }
      else if (g.kaynak === 'eurostat') {
        const ceyrek = g.veri.startsWith('lfsq');
        seri = await eurostatSeri(g.veri, g.filtre, ceyrek); if (ceyrek) periyot = 4;
      } else if (g.kaynak === 'oecd_cli') seri = cli[g.kod] || [];
      const a = analiz(seri, { periyot, cliMi: g.kaynak === 'oecd_cli' });
      if (!a) throw new Error(`yetersiz veri (${seri.length} nokta)`);
      const { filtre, ...meta } = g;
      sonuc.push({ id: (g.kod || `${g.veri}-${Object.values(g.filtre).slice(0, 2).join('-')}`), ...meta, periyot,
        ...a, seri: seri.slice(-(periyot === 12 ? 120 : 40)).map(([t, v]) => [t, yuvarla(v, 3)]) });
      process.stdout.write('.');
    } catch (e) { hatalar.push(`${g.ad}: ${e.message}`); process.stdout.write('x'); }
  }
  console.log();
  return sonuc;
}

// ---------- Nabız skoru ----------
const AGIRLIK = { oncu: 1.5, es: 1, istihdam: 0.5 };
function nabizHesapla(gostergeler) {
  const bolgeler = ['amerika', 'avrupa', 'asya', 'turkiye', 'global'];
  // ortak aylık eksen: son 60 ay
  const tumAylar = [...new Set(gostergeler.flatMap(g => g.periyot === 12 ? g.zSeri.map(x => x[0].slice(0, 7)) : []))].sort();
  const eksen = tumAylar.slice(-60);
  const zAyda = (g, ay) => {
    // yayın gecikmesi için en fazla 3 ay öncesine kadar son değeri kullan
    const harita = g._harita || (g._harita = new Map(g.zSeri.map(([t, z]) => [g.periyot === 12 ? t.slice(0, 7) : ceyrekSonAy(t), z])));
    for (let k = 0; k <= 3; k++) { const a = ayGeri(ay, k); if (harita.has(a)) return harita.get(a); }
    return null;
  };
  const sonuc = {};
  for (const b of bolgeler) {
    const uyeler = gostergeler.filter(g => g.bolge === b && g.yon !== 0 && AGIRLIK[g.katman]);
    const tarihce = eksen.map(ay => {
      let top = 0, w = 0;
      for (const g of uyeler) { const z = zAyda(g, ay); if (z == null) continue; const a = AGIRLIK[g.katman]; top += a * g.yon * Math.max(-3, Math.min(3, z)); w += a; }
      return [ay, w ? yuvarla(top / w) : null];
    }).filter(x => x[1] != null);
    const son = tarihce.at(-1), onceki = tarihce.at(-4);
    // Yayılım: göstergelerin kaçı son 3 ayda iyileşti (yönden bağımsız sayım)
    const yonler = uyeler.map(g => { const zs = g.zSeri; if (zs.length < 4) return null; const fark = g.yon * (zs.at(-1)[1] - zs.at(-4)[1]); return { g, fark }; }).filter(Boolean);
    const iyilesen = yonler.filter(x => x.fark > 0.05), kotulesen = yonler.filter(x => x.fark < -0.05);
    const oncuY = yonler.filter(x => x.g.katman === 'oncu');
    const yayilim = yonler.length ? Math.round(iyilesen.length / yonler.length * 100) : null;
    const oncuYayilim = oncuY.length ? Math.round(oncuY.filter(x => x.fark > 0.05).length / oncuY.length * 100) : null;
    sonuc[b] = {
      yayilim, oncuYayilim, iyilesenSayi: iyilesen.length, kotulesenSayi: kotulesen.length, toplamSayi: yonler.length,
      iyilesenler: iyilesen.sort((a, c) => c.fark - a.fark).slice(0, 4).map(x => x.g.ad),
      kotulesenler: kotulesen.sort((a, c) => a.fark - c.fark).slice(0, 4).map(x => x.g.ad),
      skor: son?.[1] ?? null, ay: son?.[0] ?? null, skor3AyOnce: onceki?.[1] ?? null,
      durum: durumAdi(son?.[1]), yon: son && onceki ? (son[1] - onceki[1] > 0.15 ? 'iyilesiyor' : son[1] - onceki[1] < -0.15 ? 'kotulesiyor' : 'yatay') : null,
      oncuSkor: katmanSkoru(uyeler.filter(g => g.katman === 'oncu')),
      katki: uyeler.map(g => ({ id: g.id, ad: g.ad, katman: g.katman, z: g.z })).sort((x, y) => (y.z ?? 0) - (x.z ?? 0)),
      tarihce,
    };
  }
  // Global = bölgelerin ortalaması (Türkiye hariç) + global göstergeler
  const parcalar = ['amerika', 'avrupa', 'asya', 'global'].map(b => sonuc[b]).filter(x => x.tarihce.length);
  const globalTarihce = eksen.map(ay => { const v = parcalar.map(p => p.tarihce.find(x => x[0] === ay)?.[1]).filter(x => x != null); return [ay, v.length ? yuvarla(ortalama(v)) : null]; }).filter(x => x[1] != null);
  const gs = globalTarihce.at(-1), go = globalTarihce.at(-4);
  sonuc.dunya = { skor: gs?.[1], ay: gs?.[0], skor3AyOnce: go?.[1], durum: durumAdi(gs?.[1]),
    yon: gs && go ? (gs[1] - go[1] > 0.15 ? 'iyilesiyor' : gs[1] - go[1] < -0.15 ? 'kotulesiyor' : 'yatay') : null, tarihce: globalTarihce };
  const dp = ['amerika', 'avrupa', 'asya', 'global'].map(b => sonuc[b]);
  const top = k => dp.reduce((s, x) => s + (x[k] || 0), 0);
  sonuc.dunya.iyilesenSayi = top('iyilesenSayi'); sonuc.dunya.kotulesenSayi = top('kotulesenSayi'); sonuc.dunya.toplamSayi = top('toplamSayi');
  sonuc.dunya.yayilim = sonuc.dunya.toplamSayi ? Math.round(sonuc.dunya.iyilesenSayi / sonuc.dunya.toplamSayi * 100) : null;
  const oy = dp.map(x => x.oncuYayilim).filter(x => x != null); sonuc.dunya.oncuYayilim = oy.length ? Math.round(ortalama(oy)) : null;
  sonuc.dunya.iyilesenler = dp.flatMap(x => x.iyilesenler).slice(0, 4); sonuc.dunya.kotulesenler = dp.flatMap(x => x.kotulesenler).slice(0, 4);
  for (const b in sonuc) Object.assign(sonuc[b], evreBelirle(sonuc[b]));
  for (const g of gostergeler) delete g._harita;
  return sonuc;
}

// Döngü evresi + yön cümlesi. Oran tahmini değil, yön tahmini üretir.
function evreBelirle(n) {
  if (n.skor == null || n.skor3AyOnce == null) return {};
  const ivme = n.skor - n.skor3AyOnce;
  // ivme ölü bölgesi: çok küçük değişimleri yayılımla ayır
  const yukari = Math.abs(ivme) > 0.1 ? ivme > 0 : (n.yayilim ?? 50) >= 50;
  const ustte = n.skor >= 0;
  const evre = ustte ? (yukari ? 'Genişleme' : 'Yavaşlama') : (yukari ? 'Toparlanma' : 'Daralma');
  // güven: göstergelerin ne kadarı aynı yönü gösteriyor + öncüler hemfikir mi
  const ayniYon = yukari ? n.yayilim : (n.yayilim != null ? 100 - n.yayilim : null);
  const oncuAyni = n.oncuYayilim == null ? null : (yukari ? n.oncuYayilim >= 50 : n.oncuYayilim < 50);
  let guven = 'Düşük';
  if (ayniYon != null && ayniYon >= 65 && oncuAyni !== false && Math.abs(ivme) >= 0.15) guven = 'Yüksek';
  else if (ayniYon != null && ayniYon >= 55 && oncuAyni !== false) guven = 'Orta';
  const CUMLE = {
    'Genişleme': 'Talep normalin üzerinde ve güçlenmeye devam ediyor. Önümüzdeki 3–6 ayda ciroda artış eğiliminin sürmesi beklenir; stok ve tedarik planı büyümeye göre yapılabilir.',
    'Yavaşlama': 'Talep hâlâ normalin üzerinde ama ivme kayboluyor. Büyüme yavaşlayabilir; yeni stok alımlarında temkinli olmak, tahsilatları sıkı tutmak mantıklı.',
    'Toparlanma': 'Talep henüz normalin altında ama yön yukarı döndü. Ciro artma trendine girebilir; bu genellikle stok ve satış hazırlığı için en erken fırsat penceresidir.',
    'Daralma': 'Talep normalin altında ve zayıflamaya devam ediyor. Ciroda baskı beklenebilir; maliyet ve stok kontrolü öne çıkar, dönüş için öncü göstergeler izlenmeli.',
  };
  // ivme çok küçükse "güçleniyor/dönüyor" demek abartı olur
  const YATAY = {
    ust: 'Talep normalin üzerinde ve dengeli seyrediyor; ivme belirgin değil. Ciroda mevcut eğilimin sürmesi beklenir; yön değişimini önce öncü göstergeler haber verir.',
    alt: 'Talep normalin altında ve yatay seyrediyor; belirgin bir dönüş henüz yok. Öncü göstergelerdeki iyileşme sürerse ciro artma trendine girebilir; bu takip edilmeli.',
  };
  const cumle = Math.abs(ivme) <= 0.1 ? (ustte ? YATAY.ust : YATAY.alt) + (yukari ? ' Göstergelerin çoğu hafif yukarı eğilimli.' : ' Göstergelerin çoğu hafif aşağı eğilimli.') : CUMLE[evre];
  return { evre, ivme: yuvarla(ivme), guven, cumle };
}
function katmanSkoru(liste) { const z = liste.map(g => g.yon * g.z).filter(x => x != null && isFinite(x)); return z.length ? yuvarla(ortalama(z)) : null; }
function durumAdi(s) { if (s == null) return null; if (s >= 0.75) return 'Güçlü büyüme'; if (s >= 0.25) return 'Büyüme'; if (s > -0.25) return 'Yatay'; if (s > -0.75) return 'Daralma'; return 'Güçlü daralma'; }
function ayGeri(ay, k) { const [y, m] = ay.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - k, 1)); return d.toISOString().slice(0, 7); }
function ceyrekSonAy(t) { const m = t.match(/(\d{4})-Q(\d)/); return m ? `${m[1]}-${String(m[2] * 3).padStart(2, '0')}` : t.slice(0, 7); }

// ---------- Borsa ----------
async function hisseleriTopla() {
  const liste = [];
  for (const [kod, ad, grup, bolge] of HISSELER) {
    try {
      const j = await getir(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(kod)}?range=5y&interval=1wk`, { tip: 'json' });
      const r = j.chart.result[0]; const ts = r.timestamp, c = r.indicators.adjclose?.[0]?.adjclose || r.indicators.quote[0].close;
      const seri = ts.map((t, i) => [new Date(t * 1000).toISOString().slice(0, 10), c[i]]).filter(x => x[1] != null);
      const v = seri.map(x => x[1]), n = v.length, deg = k => n > k ? yuvarla((v[n - 1] / v[n - 1 - k] - 1) * 100, 1) : null;
      liste.push({ kod, ad, grup, bolge, paraBirimi: r.meta.currency, son: yuvarla(v[n - 1], 2), tarih: seri[n - 1][0],
        d1a: deg(4), d3a: deg(13), d12a: deg(52), seri: seri.map(([t, x]) => [t, yuvarla(x, 2)]) });
      await bekle(400);
    } catch (e) { hatalar.push(`Hisse ${kod}: ${e.message}`); }
  }
  // grup endeksleri (eşit ağırlık, 5 yıl önce = 100)
  const gruplar = {};
  for (const g of ['bilesen', 'oem', 'uretim', 'tr']) {
    const uye = liste.filter(h => h.grup === g); if (!uye.length) continue;
    const haftalar = [...new Set(uye.flatMap(h => h.seri.map(x => x[0])))].sort();
    const bazlar = uye.map(h => h.seri[0][1]);
    const sonDeger = uye.map(() => null);
    gruplar[g] = haftalar.map(t => {
      uye.forEach((h, i) => { const p = h.seri.find(x => x[0] === t); if (p) sonDeger[i] = p[1] / bazlar[i] * 100; });
      const v = sonDeger.filter(x => x != null); return [t, yuvarla(ortalama(v), 1)];
    });
  }
  return { liste, gruplar };
}

// ---------- SEC çeyreklik ciro ----------
async function secTopla() {
  const sonuc = [];
  const kavramlar = ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'SalesRevenueGoodsNet', 'Revenue'];
  for (const [kod, cik, ad] of SEC_SIRKETLER) {
    try {
      const j = await getir(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`, { tip: 'json' });
      let enIyi = null;
      for (const tax of ['us-gaap', 'ifrs-full']) for (const k of kavramlar) {
        const birim = j.facts?.[tax]?.[k]?.units?.USD; if (!birim) continue;
        const ceyrek = {}; for (const f of birim) if (/^CY\d{4}Q\d$/.test(f.frame || '')) ceyrek[f.frame] = f.val;
        const anahtar = Object.keys(ceyrek).sort(); if (!anahtar.length) continue;
        if (!enIyi || anahtar.at(-1) > enIyi.son) enIyi = { son: anahtar.at(-1), ceyrek, kavram: k };
      }
      if (!enIyi) throw new Error('çeyreklik ciro bulunamadı');
      const keys = Object.keys(enIyi.ceyrek).sort().slice(-12);
      const seri = keys.map(k => { const [, y, q] = k.match(/CY(\d{4})Q(\d)/); const once = enIyi.ceyrek[`CY${y - 1}Q${q}`];
        return { donem: `${y} Ç${q}`, ciroMilyonUSD: Math.round(enIyi.ceyrek[k] / 1e6), yoy: once ? yuvarla((enIyi.ceyrek[k] / once - 1) * 100, 1) : null }; });
      sonuc.push({ kod, ad, seri, son: seri.at(-1) });
      await bekle(300);
    } catch (e) { hatalar.push(`SEC ${kod}: ${e.message}`); }
  }
  return sonuc;
}

// ---------- Dış ticaret (yıllık) ----------
async function ticaretTopla() {
  let ulkeAd = {};
  try { const c = await getir('https://www.trademap.org/api/countries', { tip: 'json' });
    for (const x of (Array.isArray(c) ? c : c.records || [])) ulkeAd[x.code ?? x.countryCd ?? x.id] = x.nameTr ?? x.name ?? x.label ?? x.countryName; } catch (e) { hatalar.push(`Trade Map ülke listesi: ${e.message}`); }
  const yil = new Date().getFullYear() - 1;
  const sonuc = [];
  for (const [hs, ad, grup] of GTIP) {
    try {
      const kayit = {};
      for (const akis of ['I', 'E']) {
        const j = await getir(`https://www.trademap.org/api/goods/timeSeries/yearly/byCountry?tradeFlow=${akis}&product=${hs}&country=000&periodFrom=${yil - 4}&periodTo=${yil}&indicator=VAL&pageSize=250&sortBy=${yil}&sortDir=desc&directMirror=D&currency=USD`, { tip: 'json' });
        const dunya = j.aggregateRecords?.[0]?.data || [];
        const ilk = (j.records || []).slice(0, 8).map(r => ({ ulke: ulkeAd[r.reporterCd] || r.reporterCd, kod: r.reporterCd, deger: r.data.find(d => d.period === yil)?.value ?? null, onceki: r.data.find(d => d.period === yil - 1)?.value ?? null }));
        const tr = (j.records || []).find(r => r.reporterCd === '792');
        kayit[akis] = { dunya: dunya.map(d => [d.period, d.value]), ilk, turkiye: tr ? tr.data.map(d => [d.period, d.value]) : [] };
        await bekle(800);
      }
      sonuc.push({ hs, ad, grup, yil, ithalat: kayit.I, ihracat: kayit.E });
    } catch (e) { hatalar.push(`Dış ticaret ${hs}: ${e.message}`); }
  }
  return sonuc;
}

// ---------- Haberler ----------
// Konuya göre alaka süzgeci: başlık bu kelimelerden birini içermiyorsa atılır
const ALAKA = {
  'Hidrolik sektörü': /hidrolik|hydraul|fluid power|pnömatik|pneumat/i,
  'Traktör / tarım makinası': /traktör|tractor|tarım mak|tarım makin|agricultur|combine|biçerdöver|farm (equipment|machinery)|harvest|grassland|AGCO|Deere|CNH|Kubota|Claas|Fendt/i,
  'İş makinası': /iş makina|iş makine|excavator|ekskavatör|construction equipment|construction machinery|loader|yükleyici|crane|vinç|hauler|Komatsu|Caterpillar|Volvo CE|bulldozer|dozer|Sany|XCMG|Liebherr|Hitachi|JCB|Bobcat|İMDER/i,
  'CNC tezgah ve işleme': /CNC|machine tool|machining|tezgah|lathe|torna|milling|freze|Mazak|DMG|Okuma|Makino|Chiron|Haas|metalworking|EMO|AMB|işleme merkezi/i,
  'Kesici takım, matkap, elmas': /takım|tool|drill|matkap|PCD|CBN|carbide|karbür|end mill|insert|kesici|cutting|grinding|taşlama|abrasive|diamond (tool|coating|wire|blade)|industrial diamond|synthetic diamond.*(industr|tool)|Sandvik|Kennametal|Seco|Iscar|Walter|Tungaloy|OSG|Mitsubishi Materials/i,
  'Yeni hidrolik ürünler': /hydraul|hidrolik|valve|valf|pump|pompa|actuator|cylinder|silindir|manifold|fluid power|hose|hortum|seal|keçe|Rexroth|Parker|Danfoss|Eaton|Bucher|Casappa|Hydac/i,
  'Montaj hattı ve otomasyon': /robot|assembly|montaj|automation|otomasyon|cobot|actuator|conveyor|AGV|AMR|gripper|vision/i,
  'Modern üretim (Endüstri 4.0)': /manufactur|üretim|factory|fabrika|industry 4|endüstri 4|digital twin|dijital ikiz|lean|yalın|additive|3D print|eklemeli|predictive|kestirimci|smart factory|akıllı fabrika|MES|IIoT/i,
};
const DISLA = /dog food|pet food|jewel|mücevher|homework|horoscope|burç|futbol|football|celebrity|recipe|tarif|Tractor Supply/i;
const ilgili = h => !DISLA.test(h.baslik) && (!ALAKA[h.konu] || ALAKA[h.konu].test(h.baslik + ' ' + (h.ozet || '')));

function xmlCoz(s) { return s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(); }
async function haberleriTopla() {
  const tum = []; const gorulen = new Set();
  for (const h of HABER) {
    try {
      const yerel = h.dil === 'tr' ? 'hl=tr&gl=TR&ceid=TR:tr' : 'hl=en-US&gl=US&ceid=US:en';
      const xml = await getir(`https://news.google.com/rss/search?q=${encodeURIComponent(h.q + ' when:14d')}&${yerel}`);
      const ogeler = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
      for (const o of ogeler.slice(0, 10)) {
        const al = t => { const m = o.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? xmlCoz(m[1]) : ''; };
        let baslik = al('title'); const kaynak = al('source');
        if (kaynak && baslik.endsWith(' - ' + kaynak)) baslik = baslik.slice(0, -(kaynak.length + 3));
        const anahtar = baslik.toLowerCase().replace(/\W+/g, ' ').slice(0, 80);
        if (gorulen.has(anahtar)) continue; gorulen.add(anahtar);
        tum.push({ konu: h.konu, bolum: h.bolum, dil: h.dil, baslik, kaynak, link: al('link'), tarih: new Date(al('pubDate')).toISOString() });
      }
      await bekle(700);
    } catch (e) { hatalar.push(`Haber "${h.konu}": ${e.message}`); }
  }
  return tum.filter(ilgili).sort((a, b) => b.tarih.localeCompare(a.tarih));
}

// ---------- Sektör yayınları (RSS) ----------
async function rssTopla() {
  const tum = [];
  for (const r of RSS) {
    try {
      const xml = await getir(r.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36' } });
      const ogeler = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]).slice(0, 12);
      for (const o of ogeler) {
        const al = t => { const m = o.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? xmlCoz(m[1]) : ''; };
        const tarih = new Date(al('pubDate')); if (isNaN(tarih) || Date.now() - tarih > 30 * 864e5) continue;
        const ozet = al('description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 260);
        tum.push({ konu: r.konu, bolum: 'uretim', dil: 'en', baslik: al('title'), kaynak: r.ad, link: al('link'), tarih: tarih.toISOString(), ozet });
      }
    } catch (e) { hatalar.push(`RSS ${r.ad}: ${e.message}`); }
  }
  return tum.filter(ilgili);
}

// ---------- Bilanço (Yahoo Finance temel veriler) ----------
const KALEMLER = ['TotalRevenue', 'GrossProfit', 'OperatingIncome', 'NetIncome', 'EBITDA', 'ResearchAndDevelopment', 'Inventory', 'TotalDebt',
  'StockholdersEquity', 'TotalAssets', 'CashAndCashEquivalents', 'OperatingCashFlow', 'CapitalExpenditure', 'FreeCashFlow'];
async function kurlariTopla(paralar) {
  const kur = { USD: 1 };
  for (const p of paralar) {
    // Yahoo "JPY=X" = 1 USD kaç JPY
    if (p === 'USD' || kur[p]) continue;
    try { const j = await getir(`https://query1.finance.yahoo.com/v8/finance/chart/${p}=X?range=5d&interval=1d`, { tip: 'json' });
      kur[p] = 1 / j.chart.result[0].meta.regularMarketPrice; await bekle(300); } catch (e) { hatalar.push(`Kur ${p}: ${e.message}`); }
  }
  return kur;
}
async function bilancoTopla() {
  const p1 = Math.floor(new Date('2020-01-01') / 1000), p2 = Math.floor(Date.now() / 1000);
  const tipler = [...KALEMLER.map(k => 'annual' + k), ...KALEMLER.map(k => 'quarterly' + k)].join(',');
  const sonuc = [];
  for (const [kod, ad, grup, bolge] of HISSELER) {
    try {
      const j = await getir(`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(kod)}?type=${tipler}&period1=${p1}&period2=${p2}`, { tip: 'json' });
      const veri = { yillik: {}, ceyreklik: {} }; let para = null;
      for (const r of j.timeseries?.result || []) {
        const tip = r.meta.type[0]; const deg = r[tip]; if (!deg) continue;
        const per = tip.startsWith('annual') ? 'yillik' : 'ceyreklik', kalem = tip.replace(/^(annual|quarterly)/, '');
        for (const x of deg) { if (!x?.reportedValue) continue; para = para || x.currencyCode;
          (veri[per][x.asOfDate] = veri[per][x.asOfDate] || {})[kalem] = x.reportedValue.raw; }
      }
      const duz = o => Object.keys(o).sort().map(t => ({ donem: t, ...o[t] }));
      const yillik = duz(veri.yillik).slice(-5), ceyreklik = duz(veri.ceyreklik).slice(-8);
      if (!yillik.length && !ceyreklik.length) throw new Error('bilanço verisi yok');
      sonuc.push({ kod, ad, grup, bolge, para, yillik, ceyreklik });
      await bekle(500);
    } catch (e) { hatalar.push(`Bilanço ${kod}: ${e.message}`); }
  }
  const kur = await kurlariTopla([...new Set(sonuc.map(s => s.para).filter(Boolean))]);
  for (const s of sonuc) s.usdKur = kur[s.para] ?? null;
  return sonuc;
}

// ---------- Ana akış ----------
(async () => {
  const t0 = Date.now();
  console.log('Göstergeler toplanıyor'); const gostergeler = await gostergeleriTopla();
  console.log('Borsa verisi toplanıyor'); const hisseler = await hisseleriTopla();
  console.log('Şirket cirosu (SEC) toplanıyor'); const sec = await secTopla();
  console.log('Dış ticaret toplanıyor'); const ticaret = await ticaretTopla();
  console.log('Haberler toplanıyor'); const haberler = (await haberleriTopla()).concat(await rssTopla()).sort((a, b) => b.tarih.localeCompare(a.tarih));
  console.log('Bilançolar toplanıyor'); const bilanco = await bilancoTopla();
  // Bir kaynak o gün cevap vermezse, bir önceki yayındaki değeri koru (ONCEKI_URL: yayındaki veri.json adresi)
  let onceki = null;
  if (process.env.ONCEKI_URL) { try { onceki = await getir(process.env.ONCEKI_URL, { tip: 'json', deneme: 2 }); } catch (e) { hatalar.push(`Önceki veri okunamadı: ${e.message}`); } }
  if (onceki) {
    const tamamla = (yeni, eski, anahtar) => { const var_ = new Set(yeni.map(anahtar)); for (const x of eski || []) if (!var_.has(anahtar(x))) yeni.push({ ...x, eski: true }); };
    tamamla(gostergeler, onceki.gostergeler, g => g.id);
    tamamla(hisseler.liste, onceki.hisseler?.liste, h => h.kod);
    for (const g in onceki.hisseler?.gruplar || {}) if (!hisseler.gruplar[g]) hisseler.gruplar[g] = onceki.hisseler.gruplar[g];
    tamamla(sec, onceki.sec, x => x.kod); tamamla(bilanco, onceki.bilanco, x => x.kod); tamamla(ticaret, onceki.ticaret, x => x.hs);
    if (haberler.length < 60) { const gor = new Set(haberler.map(h => h.baslik)); for (const h of onceki.haberler || []) if (!gor.has(h.baslik)) haberler.push(h); }
  }
  const nabiz = nabizHesapla(gostergeler);
  for (const g of gostergeler) g.zSeri = (g.zSeri || []).slice(-60);
  let ozet = null; try { ozet = JSON.parse(fs.readFileSync(path.join(__dirname, 'ozet.json'), 'utf8')); } catch {}
  const cikti = { guncelleme: new Date().toISOString(), nabiz, gostergeler, hisseler, sec, bilanco, ticaret, haberler, ozet, hatalar };
  fs.writeFileSync(path.join(__dirname, 'veri.json'), JSON.stringify(cikti));
  console.log(`Bitti (${Math.round((Date.now() - t0) / 1000)} sn). Gösterge: ${gostergeler.length}/${GOSTERGELER.length}, hisse: ${hisseler.liste.length}/${HISSELER.length}, SEC: ${sec.length}, ticaret: ${ticaret.length}, haber: ${haberler.length}, bilanço: ${bilanco.length}, hata: ${hatalar.length}`);
  if (hatalar.length) console.log(' - ' + hatalar.join('\n - '));
})();
