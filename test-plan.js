/* node test-plan.js — özet kartları, SONUÇ/TOPLAM, hedefler, yatırım önerisi, Altınkaynak ayrıştırma
   ve hücre ifadeleri için kontrol. finans.html içindeki DOM'suz <script id="core"> bloğu çalıştırılır. */
const fs = require('fs'), assert = require('assert');

const html = fs.readFileSync(__dirname + '/finans.html', 'utf8');
const core = html.split('<script id="core">')[1].split('</scr' + 'ipt>')[0];
const mod = { exports: {} };
new Function('module', core)(mod);
const M = mod.exports;

const yakin = (a, b, m) => assert.ok(Math.abs(a - b) < 0.01, (m || '') + ' beklenen ' + b + ', gelen ' + a);

/* Küçük, elle hesaplanabilir örnek: bugün = Eylül 2026 (ay 8) */
const BY = 2026, BA = 8;
function ornek() {
  return {
    nakit: 20000, gerisi: 1, ileri: 12,
    items: [{ id: 'maas', name: 'Maaş', tip: 'gelir' }, { id: 'kira', name: 'Kira', tip: 'gider' }],
    vals: {
      '2026-7': { maas: 999999 },               // geçmiş ay: SONUÇ'a girmemeli
      '2026-8': { maas: 100000, kira: 40000 },  // bu ay  net +60.000
      '2026-9': { maas: 100000, kira: 50000 },  // Ekim   net +50.000
      '2026-10': { maas: 100000, kira: 50000 }, // Kasım  net +50.000
      '2026-11': { maas: 100000, kira: 60000 }  // Aralık net +40.000 (son dolu ay)
    },
    assets: [
      { id: 'a1', name: 'Nakit', tip: 'tl', adet: 10000, fiyat: 1 },
      { id: 'a2', name: 'Altın', tip: 'altin', kod: 'GRA', adet: 10, fiyat: 6000 },
      { id: 'a3', name: 'Dolar', tip: 'doviz', kod: 'USD', adet: 100, fiyat: 40 }
    ],
    hedefler: [], yatirim: { profil: 'dengeli', acilAy: 3, yakinHedef: true }
  };
}

/* 1) Sütun düzeni: eski kayıtta SONUÇ ortadaysa bir kez en sağa alınır, TOPLAM onun sağına eklenir */
let d = ornek();
d.kolonlar = ['maas', '@gelir', '@sonuc', 'kira', '@gider', '@kalan'];
let k = M.kolonDuzelt(d);
assert.deepStrictEqual(k.slice(-3), ['@sonuc', '@toplam', '@toplamd'], 'SONUÇ, TOPLAM ve TOPLAM (döviz) en sağda');
assert.strictEqual(d.kolonV, 2);
M.kolonTasi(d, d.kolonlar.indexOf('@toplam'), -1);          // kullanıcı sonradan taşıyabilir
k = M.kolonDuzelt(d);
assert.deepStrictEqual(k.slice(-3), ['@toplam', '@sonuc', '@toplamd'], 'migrasyon ikinci kez çalışmamalı');
assert.deepStrictEqual(M.kolonDuzelt(M.SEED && JSON.parse(JSON.stringify(M.SEED))).slice(-3), ['@sonuc', '@toplam', '@toplamd']);
/* eski kayıt (TOPLAM döviz yok): TOPLAM'ın hemen sağına eklenir */
d = ornek(); d.kolonV = 2; d.kolonlar = ['maas', '@toplam', '@sonuc', 'kira', '@gelir', '@gider', '@kalan'];
assert.deepStrictEqual(M.kolonDuzelt(d).slice(0, 4), ['maas', '@toplam', '@toplamd', '@sonuc']);

/* 2) SONUÇ = eldeki nakit + bu aydan itibaren kalanlar; geçmiş ay null */
d = ornek();
assert.strictEqual(M.birikim(d, 2026, 7, BY, BA), null, 'geçmiş ay');
assert.strictEqual(M.birikim(d, 2026, 8, BY, BA), 80000, '20.000 + 60.000');
assert.strictEqual(M.birikim(d, 2026, 10, BY, BA), 180000, '+50.000 +50.000');

/* 3) Özet kartları: Varlıklar · Bu ay eldeki · Toplam · Yıl sonu */
const o = M.ozetHesap(d, BY, BA);
assert.strictEqual(o.varlik, 10000 + 60000 + 4000);
assert.strictEqual(o.eldeki, 80000);
assert.strictEqual(o.buAyNet, 60000);
assert.strictEqual(o.toplam, 80000 + 74000);
assert.strictEqual(o.ysYil, 2026);
assert.strictEqual(o.yilSonu, 80000 + 50000 + 50000 + 40000 + 74000, 'Aralık sonu birikim + varlık');
assert.strictEqual(o.ysTahmin, false, 'Aralık tabloda var, ortalama kullanılmamalı');
/* Aralıkta yıl sonu = gelecek yılın Aralığı */
assert.strictEqual(M.ozetHesap(d, 2026, 11).ysYil, 2027);

/* 4) Projeksiyon: tablo bitince ortalama aylık kalanla uzar */
const ort = M.ortAylikKalan(d, BY, BA);                     // (60+50+50+40)/4 = 50.000
assert.strictEqual(ort, 50000);
assert.strictEqual(M.tahminiToplam(d, 2027, 2, BY, BA), 220000 + 3 * 50000 + 74000, 'Mart 2027: Aralık + 3 ay ortalama');

/* 5) Hedefler: öncelik sırası, şu an, tahmin, ulaşma ayı */
d.hedefler = [
  { id: 'h1', ad: 'Tatil', tutar: 100000, ay: '2026-11' },    // Kasım 2026 hedef
  { id: 'h2', ad: 'Araba', tutar: 300000, ay: '2027-06' }
];
const hd = M.hedefDurum(d, BY, BA);
assert.strictEqual(hd[0].mevcut, 100000, 'şu an toplam 154.000 → ilk hedef dolu');
assert.strictEqual(hd[0].oran, 1);
assert.strictEqual(hd[1].mevcut, 54000, 'ikinci hedefe kalan 54.000');
assert.strictEqual(hd[1].kalanAy, 9);
/* Haziran 2027 toplam = 220.000 + 6*50.000 + 74.000 = 594.000; ilk hedef düşülünce 494.000 */
assert.strictEqual(hd[1].tahmin, 494000);
assert.strictEqual(hd[1].fark, 194000);
yakin(hd[1].aylikGerek, (300000 - 54000) / 9, 'aylık gereken');
/* 400.000 toplamı ilk ne zaman geçer: Kas 2026 = 254.000, Ara = 294.000, Oca 2027 = 344.000, Şub = 394.000, Mar = 444.000 */
assert.deepStrictEqual(hd[1].ulasma, { y: 2027, m: 2 });
assert.deepStrictEqual(M.hedefAy('2027-06'), { y: 2027, m: 5 });
assert.strictEqual(M.hedefAy('2027-13'), null);

/* 6) Yatırım planı: her ay dağıtılan = elde kalan (para kaybolmaz / uydurulmaz) */
d = ornek();
let P = M.yatirimPlani(d, BY, BA, 4);
for (const r of P.satirlar) {
  const t = r.al.nakit + r.al.altin + r.al.doviz + r.al.borsa;
  yakin(t, r.P, 'ay toplamı');
  for (const c of ['altin', 'doviz', 'borsa']) assert.ok(r.al[c] === 0 || r.al[c] >= 1000, 'küçük alım yok');
}
assert.strictEqual(P.satirlar[0].P, 80000, 'ilk ay = bu ay eldeki');
assert.strictEqual(P.ortGider, (40000 + 50000 + 50000 + 60000) / 4);
assert.strictEqual(P.acilHedef, 3 * 50000, '3 ay gider');
/* ilk ay: TL varlık 10.000; rezerv 150.000 → 80.000'in hepsi TL'ye */
assert.strictEqual(P.satirlar[0].al.nakit, 80000);
assert.strictEqual(P.satirlar[0].rez, 80000);
/* rezerv dolduktan sonra altın/döviz/borsa alınmaya başlanır */
assert.ok(P.satirlar.slice(1).some(r => r.al.borsa > 0), 'borsa hiç yoktu, alınmalı');

/* Acil fon 0 ve atak profil: rezervsiz, açığı en büyük sınıfa (borsa) daha çok gider */
d = ornek(); d.yatirim = { profil: 'atak', acilAy: 0 };
P = M.yatirimPlani(d, BY, BA, 1);
const r0 = P.satirlar[0];
assert.strictEqual(r0.rez, 0);
assert.ok(r0.al.borsa > r0.al.altin && r0.al.borsa > r0.al.doviz, 'atak: borsa ağırlıklı');

/* Yakın (≤12 ay) hedef TL'de tutulur */
d = ornek(); d.yatirim = { profil: 'dengeli', acilAy: 0, yakinHedef: true };
d.hedefler = [{ id: 'h', ad: 'Düğün', tutar: 500000, ay: '2027-03' }];
P = M.yatirimPlani(d, BY, BA, 2);
assert.strictEqual(P.yakin, 500000);
assert.deepStrictEqual(P.yakinlar, ['Düğün']);
assert.strictEqual(P.satirlar[1].al.nakit, P.satirlar[1].P, 'rezerv dolana kadar hepsi TL');

/* Açık veren ay: nakitten karşılanır, eksi yazılır */
d = ornek(); d.vals['2026-9'] = { maas: 10000, kira: 50000 };
P = M.yatirimPlani(d, BY, BA, 2);
assert.strictEqual(P.satirlar[1].P, -40000);
assert.strictEqual(P.satirlar[1].al.nakit, -40000);

/* Özel oranlar normalize edilir */
d = ornek(); d.yatirim = { profil: 'ozel', oran: { nakit: 1, altin: 1, doviz: 1, borsa: 1 } };
assert.deepStrictEqual(M.yatirimAyar(d).w, { nakit: 0.25, altin: 0.25, doviz: 0.25, borsa: 0.25 });

/* 7) Altınkaynak JSON: gram ALIŞ, eski/toptan karışmaz */
const ak = M.akAyristir(JSON.stringify([
  { Kod: 'HH', Aciklama: 'Has Toptan', Alis: '6.685,42', Satis: '6.734,27' },
  { Kod: 'GAT', Aciklama: 'Gram Toptan', Alis: '6.640,00', Satis: '6.700,00' },
  { Kod: 'GA', Aciklama: 'Gram Altın', Alis: '6.653,32', Satis: '6.770,28' },
  { Kod: 'EC', Aciklama: 'Eski Çeyrek', Alis: '10.700,00', Satis: '10.950,00' },
  { Kod: 'C', Aciklama: 'Çeyrek Altın', Alis: '10.850,00', Satis: '11.100,00' },
  { Kod: 'A', Aciklama: 'Ata Cumhuriyet', Alis: '44.000,00', Satis: '45.000,00' },
  { Kod: 'B', Aciklama: '22 Ayar Bilezik', Alis: '6.000,00', Satis: '6.300,00' }
]));
assert.deepStrictEqual(ak.GRA, { alis: 6653.32, satis: 6770.28 });
assert.strictEqual(ak.CEYREKALTIN.alis, 10850);
assert.strictEqual(ak.CUMHURIYETALTINI.alis, 44000);
assert.strictEqual(ak.ATAALTIN.alis, 44000);
/* Altınkaynak'ın gerçek kodları: PGA = sitedeki "Gram Altın" satırı (perakende). Toptan (GAT/HH_T) karışmamalı,
   açıklama farklı yazılsa bile kod belirleyici */
const akGercek = M.akAyristir(JSON.stringify([
  { Kod: 'HH_T', Aciklama: 'Has Toptan', Alis: '6.685,42', Satis: '6.734,27', GuncellenmeZamani: '27.09.2026 21:58:00' },
  { Kod: 'CH_T', Aciklama: 'Külçe Toptan', Alis: '6.651,99', Satis: '6.700,60' },
  { Kod: 'GAT', Aciklama: 'Gram Toptan', Alis: '6.640,00', Satis: '6.700,00' },
  { Kod: 'PGA', Aciklama: 'Gram', Alis: '6.653,32', Satis: '6.770,28' },
  { Kod: 'PC', Aciklama: 'Çeyrek', Alis: '10.850,00', Satis: '11.100,00' },
  { Kod: 'EC', Aciklama: 'Eski Çeyrek', Alis: '10.700,00', Satis: '10.950,00' },
  { Kod: 'PA', Aciklama: 'Ata Cumhuriyet', Alis: '44.000,00', Satis: '45.000,00' },
  { Kod: 'XAUUSD', Aciklama: 'Ons', Alis: '4.284,63', Satis: '4.284,63' }
]));
assert.deepStrictEqual(akGercek.GRA, { alis: 6653.32, satis: 6770.28 }, 'PGA = Gram Altın alış');
assert.strictEqual(akGercek.CEYREKALTIN.alis, 10850, 'PC, eski çeyrek (EC) değil');
assert.strictEqual(akGercek.ATAALTIN.alis, 44000);
/* açıklama farklı yazılsa bile Kod "GA" gram altındır */
assert.strictEqual(M.akAyristir([{ Kod: 'GA', Aciklama: 'Gram Altın (24 Ayar)', Alis: '6.653,32', Satis: '6.770,28' }]).GRA.alis, 6653.32);
assert.strictEqual(M.akAyristir('<html>Cloudflare</html>'), null);

/* HTML yedeği: menüdeki "Gram Altın" bağlantısı değil, fiyat satırı okunur */
const sayfa = '<nav><a href="/gram">Gram Altın Hesaplama</a></nav>' + 'x'.repeat(1000) +
  '<tr><td>22 Ayar Hurda</td><td>6.096,90</td><td>6.141,45</td></tr>' +
  '<tr><td>Gram Alt&#305;n</td><td>6.653,32 <i>↓</i></td><td>6.770,28</td><td>%0.00</td></tr>';
assert.deepStrictEqual(M.akHtmlAyristir(sayfa), { GRA: { alis: 6653.32, satis: 6770.28 } });
assert.strictEqual(M.akHtmlAyristir('<p>Gram Altın</p>'), null);

/* 8) Hücreye yazılan ifadeler */
const I = M.ifadeSayi;
assert.strictEqual(I('70 bin'), 70000);
assert.strictEqual(I('1,5m'), 1500000);
assert.strictEqual(I('53.000+5.000'), 58000);
assert.strictEqual(I('3000*12'), 36000);
assert.strictEqual(I('12.5'), 12.5, 'gram için noktalı ondalık');
assert.strictEqual(I('12,5'), 12.5);
assert.strictEqual(I('1.234'), 1234, 'binlik ayırıcı');
assert.strictEqual(I('70.000 ₺'), 70000);
assert.strictEqual(I('(2+3)*1000'), 5000);
assert.strictEqual(I(''), 0);
assert.strictEqual(I(4500), 4500);
assert.strictEqual(M.fiyatSayi('6.653,32'), 6653.32);

/* 9) Döviz / altın hücreleri: hesaplar güncel kurla TL'ye çevrilir */
M.kurAyarla({ USD: { alis: 40, satis: 41 }, EUR: { alis: 45, satis: 46 }, GRA: { alis: 5800, satis: 5900 } });
assert.strictEqual(M.kurTL('USD'), 41, 'döviz = satış');
assert.strictEqual(M.kurTL('GRA'), 5800, 'gram altın = alış (Varlıklar ile aynı)');
assert.deepStrictEqual(M.birimAyir('100$'), { s: '100', b: 'USD' });
assert.deepStrictEqual(M.birimAyir('50 euro'), { s: '50', b: 'EUR' });
assert.deepStrictEqual(M.birimAyir('2,5 gr'), { s: '2,5', b: 'GRA' });
assert.deepStrictEqual(M.birimAyir('70 bin tl'), { s: '70 bin', b: 'TL' });
assert.strictEqual(M.cellSum(M.hucreOku('70 bin tl')), 70000);
assert.deepStrictEqual(M.hucreOku('1,5 bin dolar'), { a: 1500, b: 'USD', k: 41 }, 'bin + dolar');
assert.deepStrictEqual(M.hucreOku('100 $'), { a: 100, b: 'USD', k: 41 });
assert.deepStrictEqual(M.hucreOku('2,5', 'GRA'), { a: 2.5, b: 'GRA', k: 5800 }, 'sütun birimi varsayılan');
assert.strictEqual(M.hucreOku('3000 tl', 'USD'), 3000, 'yazıdaki birim önce gelir');
assert.strictEqual(M.hucreOku('', 'USD'), 0);
assert.strictEqual(M.hucreYazi({ a: 2.5, b: 'GRA' }), '2,5 gr');
assert.strictEqual(M.hucreYazi(4500), '4.500');
d = ornek();
d.vals['2026-8'] = { maas: { a: 2000, b: 'USD', k: 39 }, kira: { a: 5, b: 'GRA' } };
assert.deepStrictEqual(M.ayToplam(d, 2026, 8), { gelir: 82000, gider: 29000, kalan: 53000 }, '2000×41 − 5×5800');
M.kurAyarla({});
assert.strictEqual(M.cellSum({ a: 2000, b: 'USD', k: 39 }), 78000, 'kur yoksa girişteki kur');
assert.strictEqual(M.cellSum({ a: 5, b: 'GRA' }), 0, 'hiç kur yoksa 0');
assert.strictEqual(M.birimden(1000, 'USD'), null);
M.kurAyarla({ USD: { satis: 40 } });
assert.strictEqual(M.birimden(1000, 'USD'), 25);
M.kurAyarla({});

/* 10) Hisse: maliyet, kâr, arındırma */
const bugun = new Date(2026, 9, 18);
let h = M.hisseOzet({ tip: 'hisse', adet: 100, maliyet: 200, fiyat: 250, alimTarih: '2026-10-08', arOran: 5, temettu: 400, arOdenen: 100 }, bugun);
assert.strictEqual(h.maliyet, 20000);
assert.strictEqual(h.deger, 25000);
assert.strictEqual(h.kar, 5000);
yakin(h.karYuzde, 0.25);
assert.strictEqual(h.gun, 10);
assert.strictEqual(h.yontem, 'kar');
yakin(h.arindir, (5000 + 400) * 0.05, 'kâr+temettü × oran');
yakin(h.arKalan, 270 - 100);
h = M.hisseOzet({ adet: 100, maliyet: 300, fiyat: 250, arOran: 5, arYontem: 'kar' }, bugun);
assert.strictEqual(h.kar, -5000);
assert.strictEqual(h.arindir, 0, 'zararda kâr arındırması yok');
h = M.hisseOzet({ adet: 100, maliyet: 300, fiyat: 250, arOran: 2, arYontem: 'deger' }, bugun);
yakin(h.arindir, 500, 'değer × oran');
h = M.hisseOzet({ adet: 100, fiyat: 250, arOran: 10, arYontem: 'temettu', temettu: 1000 }, bugun);
yakin(h.arindir, 100);
assert.strictEqual(h.gun, null);
const ht = M.hisseToplam({ assets: [
  { tip: 'hisse', adet: 10, maliyet: 100, fiyat: 150, arOran: 10 },
  { tip: 'hisse', adet: 10, fiyat: 50 },
  { tip: 'altin', adet: 1, fiyat: 6000 }] }, bugun);
assert.strictEqual(ht.adet, 2);
assert.strictEqual(ht.deger, 2000);
assert.strictEqual(ht.maliyet, 1000, 'maliyeti girilmeyen hisse kâra katılmaz');
assert.strictEqual(ht.kar, 500);
yakin(ht.arindir, 50);

/* 11) GAM (Katılım Bot): TAM = GAM × gün × lot, alış ve satış günü dahil, kuruşa yukarı */
assert.strictEqual(M.gamSayi('0.0038120150'), 0.003812015, 'noktalı GAM binlik sayılmaz');
assert.strictEqual(M.gamSayi('0,0038120150'), 0.003812015);
let g = M.gamHesap({ adet: 100, alimTarih: '2025-10-11', satisTarih: '2025-10-20', gamlar: [{ donem: '2025/2', bas: '', gam: '0,0038120150' }] }, bugun);
assert.strictEqual(g.gun, 10, '11.10–20.10 = 10 gün');
assert.strictEqual(g.tam, 3.82, 'Katılım Bot ASELS örneği: 3,82 TL');
/* iki dönem: her gün kendi döneminin GAM'ı */
g = M.gamHesap({ adet: 10, alimTarih: '2025-06-29', satisTarih: '2025-07-02',
  gamlar: [{ donem: '2025/2', bas: '2025-07-01', gam: 0.02 }, { donem: '2025/1', bas: '', gam: 0.01 }] }, bugun);
assert.deepStrictEqual(g.parca.map(p => p.gun), [2, 2], '29-30 Haziran 2025/1, 1-2 Temmuz 2025/2');
assert.strictEqual(g.tam, 0.6, '(2×0,01 + 2×0,02) × 10 lot');
/* satış tarihi yoksa bugüne kadar */
assert.strictEqual(M.gamHesap({ adet: 1, alimTarih: '2026-10-09', gamlar: [{ gam: 1 }] }, bugun).gun, 10);
assert.strictEqual(M.gamHesap({ adet: 1, alimTarih: '2026-10-09', gamlar: [] }, bugun), null, 'GAM yoksa hesap yok');
h = M.hisseOzet({ adet: 100, alimTarih: '2025-10-11', satisTarih: '2025-10-20', gamlar: [{ gam: '0,0038120150' }], arOdenen: 1 }, bugun);
assert.strictEqual(h.yontem, 'gam', 'oran yoksa varsayılan GAM');
assert.strictEqual(h.arindir, 3.82);
yakin(h.arKalan, 2.82);

console.log('✓ tüm plan/özet/hedef/yatırım kontrolleri geçti');
