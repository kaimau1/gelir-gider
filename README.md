بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ

# gelir-gider

## Amaç
Bu proje, kişisel/aile bütçesini aylık ve yıllık bazda takip etmek için geliştirilmiş bir gelir-gider ve varlık takip uygulamasıdır. Kullanıcı, gelir (maaş vb.) ve gider (kira, kredi kartı, faturalar vb.) kalemlerini ay ay girerek yıllık bilançosunu ve birikimini görebilir. Ayrıca altın, BIST, vadeli mevduat, döviz gibi varlıkların güncel değerini de takip edebilir. Excel dosyaları (`Gelir-Gider_Guzellestirilmis.xlsx` ve yedekleri) verinin dışa aktarılmış/yedeklenmiş halidir.

## Yöntem
Uygulama tamamen istemci taraflı (client-side), tek dosyalık HTML sayfaları (`index.html`, `finans.html`) olarak geliştirilmiştir; herhangi bir build aracı veya sunucu tarafı bileşen kullanılmaz. Veriler tarayıcının `localStorage`'ında saklanır, böylece uygulama çevrimdışı da çalışabilir. `finans.html`, güncel altın/döviz/BIST fiyatlarını çekmek için `finans.truncgil.com` gibi harici bir API'ye `fetch` isteği atar. Arayüz Türkçe metinlerle, koyu/açık tema desteğiyle ve mobil uyumlu (responsive) olarak tasarlanmıştır.

## Mobil Uygulama (Android APK)
`finans.html`, `android/` klasöründeki native bir **WebView** kabuğu ile Android uygulamasına dönüştürülmüştür. Uygulamanın ana fikri korunur: veriler cihazda `localStorage`'da tutulur, fiyatlar internetten çekilir, yedek al/yükle çalışır (blob dışa aktarma paylaşım menüsüne, dosya seçici de native seçiciye bağlanmıştır).

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
