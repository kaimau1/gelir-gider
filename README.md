بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ

# gelir-gider

## Amaç
Bu proje, kişisel/aile bütçesini aylık ve yıllık bazda takip etmek için geliştirilmiş bir gelir-gider ve varlık takip uygulamasıdır. Kullanıcı, gelir (maaş vb.) ve gider (kira, kredi kartı, faturalar vb.) kalemlerini ay ay girerek yıllık bilançosunu ve birikimini görebilir. Ayrıca altın, BIST, vadeli mevduat, döviz gibi varlıkların güncel değerini de takip edebilir. Excel dosyaları (`Gelir-Gider_Guzellestirilmis.xlsx` ve yedekleri) verinin dışa aktarılmış/yedeklenmiş halidir.

## Yöntem
Uygulama tamamen istemci taraflı (client-side), tek dosyalık HTML sayfaları (`index.html`, `finans.html`) olarak geliştirilmiştir; herhangi bir build aracı veya sunucu tarafı bileşen kullanılmaz. Veriler tarayıcının `localStorage`'ında saklanır, böylece uygulama çevrimdışı da çalışabilir. `finans.html`, güncel altın/döviz/BIST fiyatlarını çekmek için `finans.truncgil.com` gibi harici bir API'ye `fetch` isteği atar. Arayüz Türkçe metinlerle, koyu/açık tema desteğiyle ve mobil uyumlu (responsive) olarak tasarlanmıştır.
