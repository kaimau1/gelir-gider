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
assert.deepStrictEqual(k.slice(-2), ['@sonuc', '@toplam'], 'SONUÇ ve TOPLAM en sağda');
assert.strictEqual(d.kolonV, 2);
M.kolonTasi(d, d.kolonlar.indexOf('@toplam'), -1);          // kullanıcı sonradan taşıyabilir
k = M.kolonDuzelt(d);
assert.deepStrictEqual(k.slice(-2), ['@toplam', '@sonuc'], 'migrasyon ikinci kez çalışmamalı');
assert.deepStrictEqual(M.kolonDuzelt(M.SEED && JSON.parse(JSON.stringify(M.SEED))).slice(-2), ['@sonuc', '@toplam']);

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

console.log('✓ tüm plan/özet/hedef/yatırım kontrolleri geçti');
