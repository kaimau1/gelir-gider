بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ

# gelir-gider

## Amaç
Bu proje, kişisel/aile bütçesini aylık ve yıllık bazda takip etmek için geliştirilmiş bir gelir-gider ve varlık takip uygulamasıdır. Kullanıcı, gelir (maaş vb.) ve gider (kira, kredi kartı, faturalar vb.) kalemlerini ay ay girerek yıllık bilançosunu ve birikimini görebilir. Ayrıca altın, BIST, vadeli mevduat, döviz gibi varlıkların güncel değerini de takip edebilir. Excel dosyaları (`Gelir-Gider_Guzellestirilmis.xlsx` ve yedekleri) verinin dışa aktarılmış/yedeklenmiş halidir.

## Yöntem
Uygulama tamamen istemci taraflı (client-side), tek dosyalık HTML sayfaları (`index.html`, `finans.html`) olarak geliştirilmiştir; herhangi bir build aracı veya sunucu tarafı bileşen kullanılmaz. Veriler tarayıcının `localStorage`'ında saklanır, böylece uygulama çevrimdışı da çalışabilir. `finans.html`, güncel altın/döviz/BIST fiyatlarını çekmek için `finans.truncgil.com` gibi harici bir API'ye `fetch` isteği atar. Arayüz Türkçe metinlerle, koyu/açık tema desteğiyle ve mobil uyumlu (responsive) olarak tasarlanmıştır.

## Mobil Uygulama (Android APK)
`finans.html`, `android/` klasöründeki native bir **WebView** kabuğu ile Android uygulamasına dönüştürülmüştür. Uygulamanın ana fikri korunur: veriler cihazda `localStorage`'da tutulur, fiyatlar internetten çekilir, yedek al/yükle çalışır (blob dışa aktarma paylaşım menüsüne, dosya seçici de native seçiciye bağlanmıştır).

### Özellikler
- **Alt gezinme çubuğu:** 📅 Aylık Tablo · 💰 Varlıklar · 🎯 Hedefler · 📈 Yatırım. Telefonun **geri tuşu** önce açık pencereyi kapatır, alt sayfalardan Aylık Tablo'ya döner; tablodayken uygulamadan çıkar. Tema / yedek / giriş **☰ Menü**'de.
- **Özet kartları (tablo sütunlarıyla aynı hesap):**
  1. **Varlıklar** — altın + döviz + borsa + TL varlıklar (Varlıklar sayfası)
  2. **Bu ay eldeki** — eldeki nakit + bu ayın net kalanı (= tablodaki bu ayın SONUÇ'u)
  3. **Toplam** — eldeki + varlıklar (= bu ayın TOPLAM'ı)
  4. **Yıl sonu tahmini** — Aralık sonu TOPLAM; tablo Aralık'tan önce bitiyorsa ortalama aylık kalanla uzatılır.
- **SONUÇ ve TOPLAM sütunları (en sağda):** SONUÇ = *eldeki nakit + bu aydan o aya kadar her ayın kalanı*; TOPLAM = SONUÇ + varlıklar. Geçmiş ayların etkisi zaten eldeki nakitte olduğu için çift sayılmaz (geçmiş satırlarda “—”). Ay dönünce uygulama “**Yeni ay: eldeki nakdi güncelle**” kutusu gösterir; biten ayın kalanını tek dokunuşla ekleyebilir ya da elle girebilirsin.
- **Hedefler:** Ad, tutar, tarih. Hedefler üstten alta öncelikle toplam birikimden pay alır; ilerleme çubuğu, hedef tarihteki tahmini tutar (yetişiyor / şu kadar eksik), aylık gereken birikim ve tahmini ulaşma ayı gösterilir.
- **Yatırım önerisi:** Tablodaki her ayın elde kalanını ve mevcut varlıkları okuyup ay ay **TL (mevduat) / altın / döviz / borsa** dağılımı önerir:
  1. Önce **acil durum fonu** (varsayılan 3 ay gider) ve **12 ay içindeki hedefler** TL'de tamamlanır.
  2. Artan para, hiçbir şey sattırmadan, seçilen profilin (Temkinli / Dengeli / Atak / Özel oran) hedef oranına en uzak kalan sınıfa yönlendirilir; 1.000 ₺ altı tutarlar nakitte birikir.
  3. “Bu ay ne yapmalı” kartı ₺ tutarını ve yaklaşık gram / $ karşılığını verir. İstersen **🤖 Gemini'ye yorumlat** ile planı yorumlatabilirsin. *(Yatırım tavsiyesi değildir.)*
- **Altın fiyatı = Altınkaynak ALIŞ:** Gram (ve çeyrek, yarım, tam, ata/cumhuriyet) altın, altinkaynak.com'daki **alış** fiyatından (bozdurunca eline geçecek değer) çekilir (`static.altinkaynak.com/public/Gold`, olmazsa canlı kurlar sayfası). Ulaşılamazsa Truncgil alış fiyatı kullanılır; kaynak kartta yazar.
- **Hücrede hesap:** Hücreye `70 bin`, `1,5m`, `53.000+5.000`, `3000*12` yazabilirsin. Varlık adedinde `12.5` ve `12,5` ikisi de 12,5 gram olur.
- **Varlık türü “Mevduat / Fon (TL)”:** vadeli mevduat, para piyasası fonu gibi TL varlıklar (yatırım önerisinde TL sayılır).
- **Sesli / yazılı komut (Gemini):** Tablonun üstündeki kutuya yazarak veya 🎤 ile söyleyerek tabloyu değiştirebilirsin: *"spor salonu diye gider aç, her aya 3000 yaz"*, *"kirayı ekimden itibaren 70 bin yap"*, *"aidat sütununu sil"*. Ses→metin **cihazda ücretsiz** yapılır (uygulamada Android konuşma tanıma, tarayıcıda Web Speech); Gemini'ye yalnızca kısa metin + tablo özeti gider. Yapılan değişiklik **↩ Geri al** ile tek dokunuşta geri alınır.
  - Kurulum: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) adresinden ücretsiz API key al → **⚙ Ayarlar → Gemini API key**'e yapıştır → model listesi otomatik çekilir, birini seç (varsayılan: bir *flash* modeli). Key yalnızca cihazda (localStorage) durur, depoya girmez.
  - Komut mantığının kontrolü: `node test-eylem.js` · özet/hedef/yatırım/fiyat mantığı: `node test-plan.js` (CI'da APK'dan önce çalışır)
- **Sütun taşıma:** Başlıktaki `‹ ›` ile gelir/gider kalemlerinin sırasını değiştirebilirsin.
- **Tarihli girdiler:** Bir hücreye dokununca aynı ay içinde farklı günlerde (ör. 10, 15, 30) ayrı ayrı gelir/gider satırları ekleyebilirsin; hücre bunların toplamını gösterir.
- **Eldeki nakit:** Bugün elindeki nakit; SONUÇ bunun üstüne bu aydan itibaren kalanları ekler.
- **Kayan ay penceresi:** Tablo bugüne göre otomatik kayar. Kaç ay **geri** ve kaç ay **ileri** görüneceği ayarlanabilir (ör. 1 ay geri + 12 ay ileri; istenirse 3 ay veya 15 ay).
- **Gün bazlı kalan dökümü:** Her kaleme sabit bir gün atanır (tüm aylara uygulanır); "Elde Kalan"a dokununca o ayın günlük (10'unda / 15'inde / 30'unda) kalan dökümü çıkar.
- **Serbest sütun sırası:** Kalem sütunları ve özet sütunları (GELİR/GİDER/Elde Kalan/SONUÇ) `‹ ›` ile istenen sıraya taşınır.
- **Güvenilir BIST fiyatı:** Hisse fiyatları uygulamada CORS'suz native HTTP isteğiyle çekilir.
- **Sadece tabloya yakınlaştırma:** İki parmakla (veya Yakınlık düğmeleriyle / "Sığdır") tabloyu küçültüp daha çok sütun-satır görebilirsin; sayfa değil yalnızca tablo ölçeklenir. Aynı özellik varlık tablosunda da vardır.
- **Kompact varlık tablosu:** Her varlığın değeri en başta; daha az kaydırma.
- Son bırakılan durum (sekme, kaydırma, yakınlaştırma) hatırlanır.

`finans.html` **tek kaynaktır**: Gradle derleme öncesinde kök dizindeki dosyayı `assets/` içine kopyalar, böylece HTML'de yapılan her değişiklik doğrudan APK'ya yansır.

### İmzalama (tek seferlik kurulum)
Tüm APK'ların **aynı imzayla** üretilmesi için (böylece uygulamayı silmeden güncelleyebilirsiniz) kalıcı bir anahtar deposu kullanılır. Anahtar **asla depoya konmaz**; `KEYSTORE_BASE64` adlı bir **GitHub Secret** olarak saklanır.

Bir kez şu adımları yapın:
```bash
# 1) Kalıcı anahtar üret (parola ve alias iş akışıyla eşleşmeli)
keytool -genkeypair -v -keystore butcem-release.jks -alias butcem \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -storepass butcem2026 -keypass butcem2026 \
  -dname "CN=Butcem, O=Butcem, C=TR"

# 2) base64'e çevir (tek satır)
base64 -w0 butcem-release.jks > keystore.b64   # macOS: base64 -i butcem-release.jks -o keystore.b64
```
Ardından GitHub'da **Settings → Secrets and variables → Actions → New repository secret**:
- **Name:** `KEYSTORE_BASE64`
- **Secret:** `keystore.b64` dosyasının içeriği

> `butcem-release.jks` dosyasını güvenli bir yerde saklayın; kaybederseniz aynı imzayla güncelleme üretemezsiniz.

### APK nasıl üretilir
- **Otomatik (önerilen):** `KEYSTORE_BASE64` secret'ı eklendikten sonra, `main` veya çalışma dalına yapılan her push'ta iş akışı imzalı APK derler ve `v1.0.<run_number>` etiketiyle bir **GitHub Release** yayımlar. `versionCode` her yayında artar; APK'yı Releases sekmesinden `gelir-gider.apk` olarak indirebilirsiniz.
- **Yerel:** Android SDK (platform-34, build-tools 34.0.0) ve JDK 17+ ile, `butcem-release.jks` dosyasını `android/app/` içine koyup:
  ```bash
  cd android
  ./gradlew :app:assembleRelease
  # çıktı: app/build/outputs/apk/release/app-release.apk
  ```

### Teknik özet
- Uygulama adı: **Bütçem** — Paket adı: `com.gelirgider.finans`, min SDK 26, hedef SDK 34
- İzinler: `INTERNET`, `ACCESS_NETWORK_STATE`
- Tek `MainActivity` (WebView) — ek üçüncü parti çerçeve yoktur.

## Web sitesi (GitHub Pages)
`finans.html` = mobil uygulamanın tek kaynağıdır ve aynı dosya web'de de yayınlanır. Kök `index.html`, mobil uygulamaya (`finans.html`) yönlendirir; eski bütçe-tablosu deneme dosyası `butce.html` olarak durur.
- Site: **https://kaimau1.github.io/gelir-gider/**
- Doğrudan: `.../finans.html`

## Firebase senkron (cihazlar-arası)
E-posta+şifre ile giriş yapılınca veri (`gelirGiderV3`) Firestore'da `kullanicilar/{uid}` altında tutulur; telefon (APK) ve web aynı hesapla aynı veriyi görür. Giriş yapılmazsa uygulama eskisi gibi çevrimdışı `localStorage` ile çalışır.

**Tek seferlik kurulum** (kendi ücretsiz Firebase projen):
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (Analytics kapatabilirsin).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** (production mode). **Rules** sekmesine şunu yapıştır → Publish:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /kullanicilar/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. **Project settings (⚙️) → General → Your apps → Web (`</>`)** ile uygulama ekle, çıkan `firebaseConfig` değerlerini `finans.html` içindeki `FIREBASE_CONFIG` bloğuna yapıştır (apiKey, authDomain, projectId, appId). Push et → web ve (yeniden derlenen) APK senkron olur.

> E-posta+şifre girişi için ayrıca "authorized domains" ayarı gerekmez; `apiKey` gibi değerler web'de görünür olması normaldir (güvenlik Firestore kurallarıyla sağlanır).
