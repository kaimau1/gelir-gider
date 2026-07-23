بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ

# gelir-gider

## Amaç
Bu proje, kişisel/aile bütçesini aylık ve yıllık bazda takip etmek için geliştirilmiş bir gelir-gider ve varlık takip uygulamasıdır. Kullanıcı, gelir (maaş vb.) ve gider (kira, kredi kartı, faturalar vb.) kalemlerini ay ay girerek yıllık bilançosunu ve birikimini görebilir. Ayrıca altın, BIST, vadeli mevduat, döviz gibi varlıkların güncel değerini de takip edebilir. Excel dosyaları (`Gelir-Gider_Guzellestirilmis.xlsx` ve yedekleri) verinin dışa aktarılmış/yedeklenmiş halidir.

## Yöntem
Uygulama tamamen istemci taraflı (client-side), tek dosyalık HTML sayfaları (`index.html`, `finans.html`) olarak geliştirilmiştir; herhangi bir build aracı veya sunucu tarafı bileşen kullanılmaz. Veriler tarayıcının `localStorage`'ında saklanır, böylece uygulama çevrimdışı da çalışabilir. `finans.html`, güncel altın/döviz/BIST fiyatlarını çekmek için `finans.truncgil.com` gibi harici bir API'ye `fetch` isteği atar. Arayüz Türkçe metinlerle, koyu/açık tema desteğiyle ve mobil uyumlu (responsive) olarak tasarlanmıştır.

## Mobil Uygulama (Android APK)
`finans.html`, `android/` klasöründeki native bir **WebView** kabuğu ile Android uygulamasına dönüştürülmüştür. Uygulamanın ana fikri korunur: veriler cihazda `localStorage`'da tutulur, fiyatlar internetten çekilir, yedek al/yükle çalışır (blob dışa aktarma paylaşım menüsüne, dosya seçici de native seçiciye bağlanmıştır).

`finans.html` **tek kaynaktır**: Gradle derleme öncesinde kök dizindeki dosyayı `assets/` içine kopyalar, böylece HTML'de yapılan her değişiklik doğrudan APK'ya yansır.

### APK nasıl üretilir
- **Otomatik (önerilen):** `.github/workflows/android-release.yml` iş akışı, `main` veya ilgili çalışma dalına yapılan her push'ta imzalı bir APK derler ve `v1.0.<run_number>` etiketiyle bir **GitHub Release** yayımlar. APK'yı Releases sekmesinden `gelir-gider.apk` olarak indirebilirsiniz.
- **Yerel:** Android SDK (platform-34, build-tools 34.0.0) ve JDK 17+ ile:
  ```bash
  cd android
  ./gradlew :app:assembleRelease
  # çıktı: app/build/outputs/apk/release/app-release.apk
  ```
  İmzalama için `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` ortam değişkenleri kullanılır; verilmezse imzasız derlenir.

### Teknik özet
- Paket adı: `com.gelirgider.finans`, min SDK 26, hedef SDK 34
- İzinler: `INTERNET`, `ACCESS_NETWORK_STATE`
- Tek `MainActivity` (WebView) — ek üçüncü parti çerçeve yoktur.
