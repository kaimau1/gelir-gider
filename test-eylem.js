/* node test-eylem.js — Gemini eylemlerinin (tabloyu değiştiren kısım) kendi kontrolü.
   finans.html içindeki <script id="core"> bloğu DOM'suzdur; buradan çıkarılıp çalıştırılır. */
const fs = require('fs'), assert = require('assert');

const html = fs.readFileSync(__dirname + '/finans.html', 'utf8');
const core = html.split('<script id="core">')[1].split('</scr' + 'ipt>')[0];
const mod = { exports: {} };
new Function('module', core)(mod);
const { SEED, eylemleriUygula, ayToplam, cellSum, ayAnahtar, kalemBul } = mod.exports;

const yeni = () => JSON.parse(JSON.stringify(SEED));

/* 1) Yeni sütun + değer yazma */
let d = yeni();
let r = eylemleriUygula(d, [
  { tip: 'kalemEkle', ad: 'Spor Salonu', kalemTipi: 'gider', gun: 5 },
  { tip: 'hucreYaz', kalem: 'Spor Salonu', ay: '2026-9', deger: 3000 }
]);
assert.strictEqual(r.ok, 2, 'iki eylem de uygulanmalı: ' + r.hata.join('|'));
const spor = kalemBul(d, 'spor salonu');
assert.ok(spor && spor.gun === 5, 'kalem gün ile eklenmeli');
assert.strictEqual(cellSum(d.vals['2026-9'][spor.id]), 3000);
assert.ok(d.kolonlar.indexOf(spor.id) >= 0, 'yeni kalem sütun düzenine girmeli');

/* 2) Var olan hücreye ekleme / eksiltme (ad ile referans, büyük harf duyarsız) */
r = eylemleriUygula(d, [{ tip: 'hucreEkle', kalem: 'KİRA', ay: '2026-9', deger: 5000 }]);
assert.strictEqual(r.ok, 1, r.hata.join('|'));
assert.strictEqual(d.vals['2026-9'].kira, 58000, '53000 + 5000');
r = eylemleriUygula(d, [{ tip: 'hucreEkle', kalem: 'kira', ay: '2026-9', deger: -8000 }]);
assert.strictEqual(d.vals['2026-9'].kira, 50000);

/* 3) Negatife düşüren eylem uygulanmaz (para yolu: sessiz bozulma olmasın) */
r = eylemleriUygula(d, [{ tip: 'hucreEkle', kalem: 'kira', ay: '2026-9', deger: -999999 }]);
assert.strictEqual(r.ok, 0);
assert.strictEqual(d.vals['2026-9'].kira, 50000, 'değer değişmemeli');

/* 4) Hücre silme, ay toplamına yansır */
const oncekiGider = ayToplam(d, 2026, 9).gider;
r = eylemleriUygula(d, [{ tip: 'hucreSil', kalem: 'kira', ay: '2026-9' }]);
assert.strictEqual(r.ok, 1);
assert.strictEqual(ayToplam(d, 2026, 9).gider, oncekiGider - 50000);

/* 5) Sütun silme: kalem de değerleri de gider */
r = eylemleriUygula(d, [{ tip: 'kalemSil', kalem: 'Aidat' }]);
assert.strictEqual(r.ok, 1);
assert.strictEqual(kalemBul(d, 'aidat'), null);
assert.ok(!(d.vals['2026-10'] || {}).aidat, 'silinen kalemin değerleri kalmamalı');

/* 6) Geçersiz eylemler atlanır, veri bozulmaz */
const once = JSON.stringify(d);
r = eylemleriUygula(d, [
  { tip: 'hucreYaz', kalem: 'olmayan kalem', ay: '2026-9', deger: 1 },
  { tip: 'hucreYaz', kalem: 'kira', ay: '2026-13', deger: 1 },
  { tip: 'hucreYaz', kalem: 'kira', ay: 'ekim', deger: 1 },
  { tip: 'saçmaEylem' },
  null
]);
assert.strictEqual(r.ok, 0, 'hiçbiri uygulanmamalı');
assert.strictEqual(r.hata.length, 5);
assert.strictEqual(JSON.stringify(d), once, 'geçersiz eylemler veriyi değiştirmemeli');

/* 7) Ay anahtarı biçimi */
assert.strictEqual(ayAnahtar('2026-9'), '2026-9');
assert.strictEqual(ayAnahtar('2026-11'), '2026-11');
assert.strictEqual(ayAnahtar('2026-12'), null);
assert.strictEqual(ayAnahtar('Ekim 2026'), null);

/* 8) Geri al: uygulamadaki yedek mantığı (JSON kopyası) gerçekten eski hali döndürür */
const yedek = JSON.stringify(d);
eylemleriUygula(d, [{ tip: 'kalemSil', kalem: 'Kira' }, { tip: 'nakitYaz', deger: 12345 }]);
assert.notStrictEqual(JSON.stringify(d), yedek);
d = JSON.parse(yedek);
assert.ok(kalemBul(d, 'kira'), 'geri alınca kalem dönmeli');

console.log('✓ tüm eylem kontrolleri geçti');
