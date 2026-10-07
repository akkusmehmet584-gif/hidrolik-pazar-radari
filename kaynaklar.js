// Hidrolik Pazar Radarı — gösterge tanımları
// katman: oncu (talebi önceden haber verir) | es (talebin kendisi) | istihdam | maliyet | lojistik
// yon: +1 = değer artınca talep artar; 0 = nabza katılmaz, sadece izlenir
// bolge: global | amerika | avrupa | asya | turkiye
// tema: talep | uretim (üretim teknolojileri bölümünde de gösterilir)
// olcu: "Bu sayı tam olarak nedir?" sorusunun cevabı
// birim: sayının birimi; pano bunu okunur hale çevirir (ör. 45.481 milyon $ → 45,5 milyar $)

const G = o => ({ yon: 1, tema: 'talep', siklik: 'Aylık', ...o });
const fred = (kod, o) => G({ kaynak: 'fred', kod, kaynakAd: 'FRED (St. Louis Fed)', ...o });
const es = (veri, filtre, o) => G({ kaynak: 'eurostat', veri, filtre, kaynakAd: 'Eurostat', birim: 'endeks (2021 = 100)', ...o });
const esUretim = (nace, geo, ulke, ne, o = {}) => es('sts_inpr_m', { nace_r2: nace, geo, unit: 'I21', s_adj: 'SCA' }, {
  olcu: `${ulke} genelinde ${ne} üretiminin fiziksel hacmi. 2021 yılı ortalaması 100 kabul edilir; 110, 2021'e göre %10 daha fazla üretim demektir. Mevsim ve takvim etkilerinden arındırılmıştır.`, ...o });
const cli = (ulke, ad, bolge) => G({ kaynak: 'oecd_cli', kod: ulke, kaynakAd: 'OECD', ad: `OECD öncü göstergesi: ${ad}`, bolge, katman: 'oncu', birim: 'endeks (100 = uzun dönem trend)',
  olcu: `OECD'nin ${ad} için hesapladığı bileşik öncü gösterge. Sipariş, güven, borsa, faiz gibi alt verilerden oluşur ve ekonominin 6–9 ay sonraki yönünü tahmin etmek için tasarlanmıştır. 100 uzun dönem trend çizgisidir: 100'ün üstü ekonominin trendin üstünde, altı altında seyrettiğini gösterir. Yönü (yükseliyor/düşüyor) seviyesinden daha önemlidir.`,
  neden: 'Hidrolik talebi genel sanayi ve yatırım döngüsünü izler; bu gösterge o döngünün dönüş noktalarını erken yakalamak için kullanılır.' });

const GOSTERGELER = [
  // ---------- AMERİKA ----------
  fred('A33CNO', { ad: 'ABD iş makinası yeni siparişleri', bolge: 'amerika', katman: 'oncu', birim: 'milyon $',
    olcu: 'ABD\'deki iş makinası üreticilerinin (ekskavatör, yükleyici, dozer vb.) o ay aldığı yeni siparişlerin toplam tutarı. Mevsimsellikten arındırılmış, cari dolar.',
    neden: 'Bugün alınan iş makinası siparişi, birkaç ay sonra hidrolik silindir, pompa ve valf alımına dönüşür.' }),
  fred('A33AVS', { ad: 'ABD tarım makinası sevkiyatı', bolge: 'amerika', katman: 'es', birim: 'milyon $',
    olcu: 'ABD\'deki tarım makinası üreticilerinin (traktör, biçerdöver, ekipman) o ay fabrikadan çıkardığı ürünlerin toplam tutarı.',
    neden: 'Tarım makineleri hidrolik aksamın en büyük müşterilerinden; sevkiyat, üretimin anlık ölçüsüdür.' }),
  fred('A33SNO', { ad: 'ABD makine sanayi yeni siparişleri (toplam)', bolge: 'amerika', katman: 'oncu', birim: 'milyon $',
    olcu: 'ABD\'deki tüm makine üreticilerinin o ay aldığı yeni siparişlerin toplam tutarı (iş, tarım, sanayi, takım tezgahı, kompresör vb. dahil).',
    neden: 'Genel makine yatırım iştahını gösterir; hidrolik talebinin geniş tabanı.' }),
  fred('A33DNO', { ad: 'ABD maden/petrol ekipmanı siparişleri', bolge: 'amerika', katman: 'oncu', birim: 'milyon $',
    olcu: 'Madencilik, petrol ve doğalgaz sahası ekipmanı üreticilerinin o ay aldığı yeni siparişlerin toplam tutarı.',
    neden: 'Sondaj ve maden ekipmanı yoğun hidrolik kullanır.' }),
  fred('IPG3331S', { ad: 'ABD tarım-inşaat-maden makinası üretimi', bolge: 'amerika', katman: 'es', birim: 'endeks (2017 = 100)',
    olcu: 'ABD\'de tarım, inşaat ve maden makinası üretiminin fiziksel hacmi (fiyat etkisi yok). 2017 ortalaması 100.',
    neden: 'Hidrolik tüketen makinaların gerçek üretim adedine en yakın ölçü.' }),
  fred('IPG333S', { ad: 'ABD makine sanayi üretimi', bolge: 'amerika', katman: 'es', birim: 'endeks (2017 = 100)',
    olcu: 'ABD\'de tüm makine imalatının fiziksel hacmi. 2017 ortalaması 100.', neden: 'Genel makine üretim hacmi.' }),
  fred('TTLCONS', { ad: 'ABD toplam inşaat harcaması', bolge: 'amerika', katman: 'es', birim: 'milyon $ (yıllık hız)',
    olcu: 'ABD\'de o ay yapılan tüm inşaat harcaması (konut, ticari, kamu). "Yıllık hız": o ayın harcaması 12 ay sürseydi ulaşılacak toplam.',
    neden: 'İnşaat aktivitesi iş makinası kullanımını ve yedek parça talebini belirler.' }),
  fred('HOUST', { ad: 'ABD konut başlangıçları', bolge: 'amerika', katman: 'oncu', birim: 'bin adet (yıllık hız)',
    olcu: 'O ay inşaatına başlanan yeni konut sayısı, yıllık hıza çevrilmiş. 1.300 = bu tempoda yılda 1,3 milyon konut.',
    neden: 'Yeni inşaatın ilk sinyali; ekskavatör ve yükleyici talebini önden gösterir.' }),
  fred('PERMIT', { ad: 'ABD inşaat ruhsatları', bolge: 'amerika', katman: 'oncu', birim: 'bin adet (yıllık hız)',
    olcu: 'O ay verilen konut inşaat ruhsatı sayısı, yıllık hıza çevrilmiş.', neden: 'Konut başlangıçlarından da önce gelen inşaat sinyali.' }),
  fred('USCONS', { ad: 'ABD inşaat istihdamı', bolge: 'amerika', katman: 'istihdam', birim: 'bin kişi',
    olcu: 'ABD inşaat sektöründe çalışan toplam kişi sayısı (bin). 8.300 = 8,3 milyon kişi.', neden: 'Sahada çalışan makine parkının dolaylı ölçüsü.' }),
  fred('CES3133300001', { ad: 'ABD makine sanayi istihdamı', bolge: 'amerika', katman: 'istihdam', birim: 'bin kişi',
    olcu: 'ABD makine imalatında çalışan toplam kişi sayısı (bin).', neden: 'Makine üreticilerinin kapasite kararlarını yansıtır.' }),
  cli('USA', 'ABD', 'amerika'),

  // ---------- AVRUPA ----------
  esUretim('C2812', 'EU27_2020', 'Avrupa Birliği', 'hidrolik ve pnömatik ekipman (pompa, motor, silindir, valf)', { ad: 'AB hidrolik/pnömatik ekipman üretimi', bolge: 'avrupa', katman: 'es', neden: 'Doğrudan hidrolik sektörünün üretim hacmi (NACE 28.12).' }),
  esUretim('C2812', 'DE', 'Almanya', 'hidrolik ve pnömatik ekipman', { ad: 'Almanya hidrolik/pnömatik ekipman üretimi', bolge: 'avrupa', katman: 'es', neden: 'Avrupa hidroliğinin merkezi (Bosch Rexroth, Hydac, Argo-Hytos).' }),
  esUretim('C2812', 'IT', 'İtalya', 'hidrolik ve pnömatik ekipman', { ad: 'İtalya hidrolik/pnömatik ekipman üretimi', bolge: 'avrupa', katman: 'es', neden: 'Avrupa\'nın ikinci hidrolik üssü (Interpump, Casappa, Walvoil).' }),
  esUretim('C283', 'EU27_2020', 'Avrupa Birliği', 'tarım ve ormancılık makinası (traktör dahil)', { ad: 'AB tarım makinası üretimi', bolge: 'avrupa', katman: 'es', neden: 'Traktör ve tarım makinası üretimi.' }),
  esUretim('C2892', 'DE', 'Almanya', 'inşaat ve maden makinası', { ad: 'Almanya iş makinası üretimi', bolge: 'avrupa', katman: 'es', neden: 'İnşaat ve maden makinası üretimi (NACE 28.92).' }),
  esUretim('C2892', 'IT', 'İtalya', 'inşaat ve maden makinası', { ad: 'İtalya iş makinası üretimi', bolge: 'avrupa', katman: 'es', neden: 'İnşaat ve maden makinası üretimi (NACE 28.92).' }),
  esUretim('C28', 'EU27_2020', 'Avrupa Birliği', 'tüm makine ve teçhizat', { ad: 'AB makine sanayi üretimi', bolge: 'avrupa', katman: 'es', neden: 'Genel makine üretimi.' }),
  es('sts_copr_m', { nace_r2: 'F', geo: 'EU27_2020', unit: 'I21', s_adj: 'SCA', indic_bt: 'PRD' }, { ad: 'AB inşaat üretimi', bolge: 'avrupa', katman: 'es',
    olcu: 'Avrupa Birliği\'nde bina ve altyapı inşaatının hacmi. 2021 ortalaması 100.', neden: 'İnşaat aktivitesi.' }),
  es('lfsq_egan2', { nace_r2: 'A', geo: 'EU27_2020', sex: 'T', age: 'Y15-74', unit: 'THS_PER' }, { ad: 'AB tarım istihdamı', bolge: 'avrupa', katman: 'istihdam', yon: 0, siklik: 'Çeyreklik', birim: 'bin kişi',
    olcu: 'Avrupa Birliği\'nde tarım, ormancılık ve balıkçılıkta çalışan kişi sayısı (bin). 6.500 = 6,5 milyon kişi.',
    neden: 'Tarımda iş gücü azaldıkça makineleşme (ve hidrolik) artar; uzun vadeli yapısal gösterge, nabza katılmaz.' }),
  es('lfsq_egan2', { nace_r2: 'F', geo: 'EU27_2020', sex: 'T', age: 'Y15-74', unit: 'THS_PER' }, { ad: 'AB inşaat istihdamı', bolge: 'avrupa', katman: 'istihdam', siklik: 'Çeyreklik', birim: 'bin kişi',
    olcu: 'Avrupa Birliği\'nde inşaat sektöründe çalışan kişi sayısı (bin).', neden: 'İnşaat sektörünün büyüklüğü.' }),
  cli('DEU', 'Almanya', 'avrupa'), cli('ITA', 'İtalya', 'avrupa'), cli('FRA', 'Fransa', 'avrupa'), cli('GBR', 'Birleşik Krallık', 'avrupa'),

  // ---------- TÜRKİYE ----------
  esUretim('C2812', 'TR', 'Türkiye', 'hidrolik ve pnömatik ekipman', { ad: 'Türkiye hidrolik/pnömatik ekipman üretimi', bolge: 'turkiye', katman: 'es', neden: 'Türkiye\'deki hidrolik üretim hacmi (NACE 28.12).' }),
  esUretim('C283', 'TR', 'Türkiye', 'tarım ve ormancılık makinası (traktör dahil)', { ad: 'Türkiye tarım makinası üretimi', bolge: 'turkiye', katman: 'es', neden: 'Traktör ve tarım makinası üretimi.' }),
  esUretim('C2892', 'TR', 'Türkiye', 'inşaat ve maden makinası', { ad: 'Türkiye iş makinası üretimi', bolge: 'turkiye', katman: 'es', neden: 'İnşaat ve maden makinası üretimi.' }),
  esUretim('C2822', 'TR', 'Türkiye', 'kaldırma ve taşıma ekipmanı (vinç, forklift, platform)', { ad: 'Türkiye kaldırma-taşıma ekipmanı üretimi', bolge: 'turkiye', katman: 'es', neden: 'Vinç, forklift, platform: hidrolik silindir yoğun ürünler.' }),
  esUretim('C28', 'TR', 'Türkiye', 'tüm makine ve teçhizat', { ad: 'Türkiye makine sanayi üretimi', bolge: 'turkiye', katman: 'es', neden: 'Genel makine üretimi.' }),
  es('sts_copr_m', { nace_r2: 'F', geo: 'TR', unit: 'I21', s_adj: 'SCA', indic_bt: 'PRD' }, { ad: 'Türkiye inşaat üretimi', bolge: 'turkiye', katman: 'es',
    olcu: 'Türkiye\'de bina ve altyapı inşaatının hacmi. 2021 ortalaması 100.', neden: 'İnşaat aktivitesi; iş makinası kullanımı ve yedek parça talebi.' }),
  cli('TUR', 'Türkiye', 'turkiye'),

  // ---------- ASYA ----------
  cli('CHN', 'Çin', 'asya'), cli('JPN', 'Japonya', 'asya'), cli('KOR', 'Güney Kore', 'asya'), cli('IND', 'Hindistan', 'asya'), cli('A5M', 'Asya\'nın 5 büyük ekonomisi', 'asya'),

  // ---------- GLOBAL ----------
  cli('G20', 'G20', 'global'),
  fred('PWHEAMTUSDM', { ad: 'Buğday fiyatı', bolge: 'global', katman: 'oncu', birim: '$/ton', olcu: 'Dünya buğday fiyatı (ABD Körfez ihraç fiyatı), ayın ortalaması, ton başına dolar.',
    neden: 'Çiftçi geliri yükselince traktör ve tarım makinası alımı artar (genellikle 6–12 ay gecikmeli).' }),
  fred('PMAIZMTUSDM', { ad: 'Mısır fiyatı', bolge: 'global', katman: 'oncu', birim: '$/ton', olcu: 'Dünya mısır fiyatı (ABD Körfez ihraç fiyatı), ayın ortalaması, ton başına dolar.', neden: 'Çiftçi geliri göstergesi.' }),

  // ---------- ÜRETİM TEKNOLOJİLERİ (tema: uretim) ----------
  fred('A33INO', { ad: 'ABD metal işleme makinası yeni siparişleri', bolge: 'amerika', katman: 'oncu', tema: 'uretim', birim: 'milyon $',
    olcu: 'ABD\'de CNC tezgah, pres, kesici takım ve kalıp gibi metal işleme makinası üreticilerinin o ay aldığı yeni siparişlerin toplam tutarı.',
    neden: 'Fabrikaların tezgah yatırımı; hem üretim kapasitesi artışını hem hidrolik ünite ve CNC yağı talebini önden gösterir.' }),
  fred('IPG3335S', { ad: 'ABD metal işleme makinası üretimi', bolge: 'amerika', katman: 'es', tema: 'uretim', birim: 'endeks (2017 = 100)',
    olcu: 'ABD\'de metal işleme makinası (tezgah, takım, kalıp) üretiminin fiziksel hacmi. 2017 ortalaması 100.', neden: 'Tezgah üretiminin anlık ölçüsü.' }),
  esUretim('C2841', 'EU27_2020', 'Avrupa Birliği', 'metal işleme takım tezgahı (CNC torna, freze, işleme merkezi, pres)', { ad: 'AB CNC/takım tezgahı üretimi', bolge: 'avrupa', katman: 'es', tema: 'uretim', neden: 'Avrupa tezgah yatırımı; Almanya ve İtalya dünya tezgah ihracatının önde gelenleri.' }),
  esUretim('C2841', 'DE', 'Almanya', 'metal işleme takım tezgahı', { ad: 'Almanya CNC/takım tezgahı üretimi', bolge: 'avrupa', katman: 'es', tema: 'uretim', neden: 'Dünyanın en büyük tezgah üreticilerinden (DMG Mori, Trumpf, Grob).' }),
  esUretim('C2841', 'TR', 'Türkiye', 'metal işleme takım tezgahı', { ad: 'Türkiye CNC/takım tezgahı üretimi', bolge: 'turkiye', katman: 'es', tema: 'uretim', neden: 'CNC ve pres üretimi; hidrolik ünite ve CNC yağı talebi.' }),
  esUretim('C2573', 'EU27_2020', 'Avrupa Birliği', 'el aletleri ve kesici takım (matkap ucu, freze, kesici uç, testere)', { ad: 'AB kesici takım ve el aleti üretimi', bolge: 'avrupa', katman: 'es', tema: 'uretim', neden: 'Talaşlı imalatın sarf tarafı; atölyelerin iş yükünü hızlı yansıtır.' }),
  esUretim('C2573', 'DE', 'Almanya', 'el aletleri ve kesici takım', { ad: 'Almanya kesici takım ve el aleti üretimi', bolge: 'avrupa', katman: 'es', tema: 'uretim', neden: 'Kesici takım sanayisinin merkezlerinden.' }),
  esUretim('C2573', 'TR', 'Türkiye', 'el aletleri ve kesici takım', { ad: 'Türkiye kesici takım ve el aleti üretimi', bolge: 'turkiye', katman: 'es', tema: 'uretim', neden: 'Türkiye\'de talaşlı imalat atölyelerinin sarf tüketimi.' }),

  // ---------- MALİYET (nabza girmez) ----------
  fred('WPU101', { ad: 'Çelik ürünleri fiyat endeksi (ABD)', bolge: 'global', katman: 'maliyet', yon: 0, birim: 'endeks (1982 = 100)',
    olcu: 'ABD üretici fiyat endeksi: demir-çelik ürünleri. 1982 fiyatları 100 kabul edilir; 378, fiyatların 1982\'nin 3,78 katı olduğu anlamına gelir. Yön ve yıllık değişim önemlidir.',
    neden: 'Silindir borusu, mil ve gövde için ana hammadde.' }),
  fred('PALUMUSDM', { ad: 'Alüminyum', bolge: 'global', katman: 'maliyet', yon: 0, birim: '$/ton', olcu: 'Londra Metal Borsası alüminyum fiyatı, ayın ortalaması, ton başına dolar.', neden: 'Pompa ve valf gövdeleri.' }),
  fred('PCOPPUSDM', { ad: 'Bakır', bolge: 'global', katman: 'maliyet', yon: 0, birim: '$/ton', olcu: 'Londra Metal Borsası bakır fiyatı, ayın ortalaması, ton başına dolar.', neden: 'Bobin, elektrik aksamı; aynı zamanda küresel sanayi talebinin barometresi.' }),
  fred('PNICKUSDM', { ad: 'Nikel', bolge: 'global', katman: 'maliyet', yon: 0, birim: '$/ton', olcu: 'Londra Metal Borsası nikel fiyatı, ayın ortalaması, ton başına dolar.', neden: 'Krom-nikel kaplama ve paslanmaz parçalar.' }),
  fred('PRUBBUSDM', { ad: 'Doğal kauçuk', bolge: 'global', katman: 'maliyet', yon: 0, birim: 'ABD senti/kg', olcu: 'Singapur doğal kauçuk fiyatı, ayın ortalaması, kilogram başına ABD senti (100 sent = 1 $).', neden: 'Keçe, o-ring ve hortum maliyeti.' }),
  fred('DCOILBRENTEU', { ad: 'Brent petrol', bolge: 'global', katman: 'maliyet', yon: 0, birim: '$/varil', siklik: 'Günlük', olcu: 'Brent ham petrol fiyatı, ayın ortalaması, varil (159 litre) başına dolar.', neden: 'Hidrolik yağ, CNC yağı ve lojistik maliyeti.' }),
  fred('PCU324191324191', { ad: 'Madeni yağ ve gres üretici fiyatları (ABD)', bolge: 'global', katman: 'maliyet', yon: 0, birim: 'endeks (baz dönem = 100)',
    olcu: 'ABD\'de madeni yağ ve gres üreticilerinin satış fiyatlarındaki değişimi izleyen endeks. Hidrolik yağ, kesme yağı ve kızak yağı bu gruptadır.', neden: 'Hidrolik yağ ve CNC yağlarının fiyat yönü.' }),
  fred('PCU333995333995', { ad: 'Hidrolik silindir üretici fiyatları (ABD)', bolge: 'global', katman: 'maliyet', yon: 0, birim: 'endeks (baz dönem = 100)',
    olcu: 'ABD\'de hidrolik ve pnömatik silindir üreticilerinin satış fiyatlarını izleyen endeks.', neden: 'Sektörün kendi satış fiyatlarındaki eğilim; fiyat artırma gücünü gösterir.' }),
  fred('PCU3339963339960', { ad: 'Hidrolik pompa ve motor üretici fiyatları (ABD)', bolge: 'global', katman: 'maliyet', yon: 0, birim: 'endeks (baz dönem = 100)',
    olcu: 'ABD\'de hidrolik pompa ve motor üreticilerinin satış fiyatlarını izleyen endeks.', neden: 'Sektörün kendi satış fiyatlarındaki eğilim.' }),

  // ---------- LOJİSTİK (nabza girmez) ----------
  fred('PCU483111483111', { ad: 'Okyanus konteyner/yük taşıma fiyatları', bolge: 'global', katman: 'lojistik', yon: 0, birim: 'endeks (baz dönem = 100)',
    olcu: 'Derin deniz yük taşımacılığı ücretlerini izleyen ABD üretici fiyat endeksi. Asya–Avrupa–Amerika arası navlunun yönünü gösterir.', neden: 'İthal parça, hammadde ve ihracat navlun maliyeti.' }),
  fred('PCU481112481112', { ad: 'Hava kargo fiyatları', bolge: 'global', katman: 'lojistik', yon: 0, birim: 'endeks (baz dönem = 100)',
    olcu: 'Planlı hava kargo taşıma ücretlerini izleyen ABD üretici fiyat endeksi.', neden: 'Acil yedek parça ve numune gönderim maliyeti.' }),
  fred('PCU484121484121', { ad: 'Uzun yol kamyon taşıma fiyatları', bolge: 'global', katman: 'lojistik', yon: 0, birim: 'endeks (baz dönem = 100)',
    olcu: 'Uzun mesafe tam kamyon (FTL) taşıma ücretlerini izleyen ABD üretici fiyat endeksi.', neden: 'Kara nakliyesi maliyeti.' }),
  fred('GASDESW', { ad: 'Mazot fiyatı (ABD)', bolge: 'global', katman: 'lojistik', yon: 0, birim: '$/galon', siklik: 'Haftalık',
    olcu: 'ABD perakende motorin fiyatı, galon (3,785 litre) başına dolar; ayın ortalaması.', neden: 'Nakliye ve iş makinası işletme maliyeti.' }),
  fred('FRGEXPUSM649NCIS', { ad: 'Cass navlun harcama endeksi (ABD)', bolge: 'global', katman: 'lojistik', yon: 0, birim: 'endeks (Ocak 1990 = 1)',
    olcu: 'ABD\'de şirketlerin nakliyeye ödediği toplam tutarı izleyen endeks (fiyat × hacim). 3,7 = 1990 Ocak ayının 3,7 katı.', neden: 'Toplam lojistik maliyet baskısı.' }),
  fred('FRGSHPUSM649NCIS', { ad: 'Cass sevkiyat hacmi endeksi (ABD)', bolge: 'global', katman: 'lojistik', yon: 0, birim: 'endeks (Ocak 1990 = 1)',
    olcu: 'ABD\'de taşınan yük adedini izleyen endeks. Fiyat değil, hacimdir: sanayide mal hareketinin ölçüsü.', neden: 'Fiziksel ekonominin hızı; düşüş genelde sanayi yavaşlamasının işaretidir.' }),
];

// Borsa ve bilanço: grup = bilesen | oem | uretim | tr
const HISSELER = [
  ['PH', 'Parker Hannifin', 'bilesen', 'amerika'], ['ETN', 'Eaton', 'bilesen', 'amerika'], ['HLIO', 'Helios Technologies', 'bilesen', 'amerika'],
  ['EPAC', 'Enerpac', 'bilesen', 'amerika'], ['DCI', 'Donaldson (filtre)', 'bilesen', 'amerika'], ['GTES', 'Gates (hortum)', 'bilesen', 'amerika'],
  ['IP.MI', 'Interpump', 'bilesen', 'avrupa'], ['BUCN.SW', 'Bucher Industries', 'bilesen', 'avrupa'],
  ['6273.T', 'SMC', 'bilesen', 'asya'], ['7012.T', 'Kawasaki Heavy', 'bilesen', 'asya'], ['7242.T', 'KYB', 'bilesen', 'asya'],
  ['6268.T', 'Nabtesco', 'bilesen', 'asya'], ['601100.SS', 'Jiangsu Hengli Hydraulic', 'bilesen', 'asya'],
  ['CAT', 'Caterpillar', 'oem', 'amerika'], ['DE', 'Deere', 'oem', 'amerika'], ['CNH', 'CNH Industrial', 'oem', 'amerika'], ['AGCO', 'AGCO', 'oem', 'amerika'],
  ['VOLV-B.ST', 'Volvo', 'oem', 'avrupa'], ['6301.T', 'Komatsu', 'oem', 'asya'], ['6326.T', 'Kubota', 'oem', 'asya'],
  ['600031.SS', 'Sany Heavy', 'oem', 'asya'], ['000425.SZ', 'XCMG', 'oem', 'asya'], ['241560.KS', 'Doosan Bobcat', 'oem', 'asya'],
  ['SAND.ST', 'Sandvik (kesici takım)', 'uretim', 'avrupa'], ['KMT', 'Kennametal (kesici takım)', 'uretim', 'amerika'], ['6136.T', 'OSG (matkap/kılavuz)', 'uretim', 'asya'],
  ['6140.T', 'Asahi Diamond (elmas takım)', 'uretim', 'asya'], ['6954.T', 'Fanuc (CNC kontrol, robot)', 'uretim', 'asya'], ['6141.T', 'DMG Mori (CNC tezgah)', 'uretim', 'asya'],
  ['6103.T', 'Okuma (CNC tezgah)', 'uretim', 'asya'], ['6135.T', 'Makino (işleme merkezi)', 'uretim', 'asya'], ['6506.T', 'Yaskawa (robot, servo)', 'uretim', 'asya'],
  ['ABBN.SW', 'ABB (robot, otomasyon)', 'uretim', 'avrupa'], ['SIE.DE', 'Siemens (fabrika otomasyonu)', 'uretim', 'avrupa'], ['ROK', 'Rockwell Automation', 'uretim', 'amerika'],
  ['TTRAK.IS', 'Türk Traktör', 'tr', 'turkiye'], ['HKTM.IS', 'Hidropar Hareket Kontrol', 'tr', 'turkiye'],
];

// SEC: ABD'de raporlayan şirketlerin çeyreklik cirosu (CIK)
const SEC_SIRKETLER = [
  ['PH', 76334, 'Parker Hannifin'], ['ETN', 1551182, 'Eaton'], ['CAT', 18230, 'Caterpillar'], ['DE', 315189, 'Deere'],
  ['HLIO', 1024795, 'Helios Technologies'], ['EPAC', 6955, 'Enerpac'], ['AGCO', 880266, 'AGCO'], ['CNH', 1567094, 'CNH Industrial'],
];

// Dış ticaret (yıllık, Trade Map): grup = hidrolik | uretim
const GTIP = [
  ['841221', 'Hidrolik silindirler', 'hidrolik'], ['841229', 'Hidrolik motorlar', 'hidrolik'], ['841360', 'Döner pompalar (dişli/paletli)', 'hidrolik'],
  ['848120', 'Hidrolik valfler', 'hidrolik'], ['841290', 'Hidrolik/pnömatik motor parçaları', 'hidrolik'], ['400942', 'Takviyeli kauçuk hortum (rakorlu)', 'hidrolik'],
  ['845710', 'CNC işleme merkezleri', 'uretim'], ['845811', 'CNC yatay torna tezgahları', 'uretim'], ['820750', 'Delme takımları (matkap uçları)', 'uretim'],
  ['820770', 'Frezeleme takımları', 'uretim'], ['820900', 'Sinterlenmiş karbür kesici uçlar', 'uretim'], ['710510', 'Sentetik/doğal elmas tozu (takım elmasları)', 'uretim'],
];

// Haber radarı: Google Haberler sorguları (tek ifadeli sorgular daha iyi sonuç verir)
// bolum: pazar | uretim
const HABER = [
  ['Hidrolik sektörü','tr','hidrolik pompa'], ['Hidrolik sektörü','tr','hidrolik silindir'], ['Hidrolik sektörü','tr','hidrolik sektörü'],
  ['Hidrolik sektörü','en','hydraulics market'], ['Hidrolik sektörü','en','fluid power'], ['Hidrolik sektörü','en','hydraulic cylinder market'],
  ['Şirket haberleri','en','Parker Hannifin'], ['Şirket haberleri','en','Bosch Rexroth'], ['Şirket haberleri','en','Danfoss Power Solutions'],
  ['Şirket haberleri','en','Interpump'], ['Şirket haberleri','en','Komatsu demand'], ['Şirket haberleri','en','Caterpillar dealer inventory'],
  ['Traktör / tarım makinası','tr','traktör satışları'], ['Traktör / tarım makinası','tr','traktör pazarı'], ['Traktör / tarım makinası','tr','tarım makinaları'],
  ['Traktör / tarım makinası','en','tractor sales'], ['Traktör / tarım makinası','en','combine harvester sales'], ['Traktör / tarım makinası','en','agricultural machinery market Europe'],
  ['İş makinası','tr','iş makinaları pazarı'], ['İş makinası','tr','iş makinası satışları'],
  ['İş makinası','en','construction equipment market'], ['İş makinası','en','excavator sales China'], ['İş makinası','en','construction equipment sales Europe'],
  ['İnşaat','tr','inşaat sektörü'], ['İnşaat','tr','konut satışları'], ['İnşaat','en','construction spending'],
  ['Yeni yatırım / fabrika','tr','yeni fabrika yatırımı'], ['Yeni yatırım / fabrika','tr','OSB yeni tesis'], ['Yeni yatırım / fabrika','tr','teşvik belgesi makine'],
  ['Hammadde','tr','çelik fiyatları'], ['Hammadde','tr','hurda fiyatları'], ['Hammadde','en','hot-rolled coil price'], ['Hammadde','en','base oil prices'],
  ['Lojistik','tr','navlun fiyatları'], ['Lojistik','en','container freight rates'], ['Lojistik','en','Drewry World Container Index'],
  ['Makro / PMI','tr','imalat PMI'], ['Makro / PMI','tr','kapasite kullanım oranı'], ['Makro / PMI','en','manufacturing PMI'],
  // Üretim teknolojileri
  ['CNC tezgah ve işleme','tr','CNC tezgah'], ['CNC tezgah ve işleme','en','CNC machine tool launch'], ['CNC tezgah ve işleme','en','5-axis machining center'], ['CNC tezgah ve işleme','en','machine tool orders'],
  ['Kesici takım, matkap, elmas','tr','kesici takım'], ['Kesici takım, matkap, elmas','en','cutting tools new'], ['Kesici takım, matkap, elmas','en','PCD diamond tools'], ['Kesici takım, matkap, elmas','en','CBN tooling'], ['Kesici takım, matkap, elmas','en','carbide drill'], ['Kesici takım, matkap, elmas','en','synthetic diamond industrial'],
  ['Yeni hidrolik ürünler','en','new hydraulic pump launch'], ['Yeni hidrolik ürünler','en','electro-hydraulic actuator'], ['Yeni hidrolik ürünler','en','electrification hydraulics'], ['Yeni hidrolik ürünler','en','smart hydraulic valve'], ['Yeni hidrolik ürünler','en','3D printed hydraulic manifold'],
  ['Montaj hattı ve otomasyon','tr','montaj hattı otomasyon'], ['Montaj hattı ve otomasyon','en','automated assembly line'], ['Montaj hattı ve otomasyon','en','collaborative robot assembly'], ['Montaj hattı ve otomasyon','en','industrial robot orders'],
  ['Modern üretim (Endüstri 4.0)','tr','endüstri 4.0'], ['Modern üretim (Endüstri 4.0)','tr','dijital ikiz üretim'], ['Modern üretim (Endüstri 4.0)','en','digital twin manufacturing'], ['Modern üretim (Endüstri 4.0)','en','predictive maintenance manufacturing'], ['Modern üretim (Endüstri 4.0)','en','lean manufacturing'], ['Modern üretim (Endüstri 4.0)','en','additive manufacturing metal'],
].map(([konu, dil, q]) => ({ konu, dil, q, bolum: ['CNC tezgah ve işleme','Kesici takım, matkap, elmas','Yeni hidrolik ürünler','Montaj hattı ve otomasyon','Modern üretim (Endüstri 4.0)'].includes(konu) ? 'uretim' : 'pazar' }));

// Sektör yayınlarının RSS akışları (üretim teknolojileri bölümü)
const RSS = [
  { konu: 'Yeni hidrolik ürünler', ad: 'Fluid Power World', url: 'https://www.fluidpowerworld.com/feed/' },
  { konu: 'Montaj hattı ve otomasyon', ad: 'The Robot Report', url: 'https://www.therobotreport.com/feed/' },
  { konu: 'Modern üretim (Endüstri 4.0)', ad: 'Manufacturing Tomorrow', url: 'https://www.manufacturingtomorrow.com/rss/news' },
];

module.exports = { GOSTERGELER, HISSELER, SEC_SIRKETLER, GTIP, HABER, RSS };
