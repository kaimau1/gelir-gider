package com.gelirgider.finans;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;

/**
 * finans.html dosyasını tam ekran bir WebView içinde çalıştıran kabuk uygulama.
 * Uygulamanın ana fikri korunur:
 *  - localStorage ile çevrimdışı veri saklama
 *  - altın/döviz/BIST fiyatlarını internetten çekme (fetch)
 *  - "Yedek Al" (blob JSON dışa aktarma) -> paylaşım menüsü ile kaydetme
 *  - "Yedek Yükle" (dosya seçici) -> WebChromeClient.onShowFileChooser
 */
public class MainActivity extends Activity {

    private static final int REQ_FILE_CHOOSER = 1001;

    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme();
                // http/https bağlantılarını harici tarayıcıda aç; yerel içerik WebView'de kalsın.
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, u));
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // "Yedek Al" özelliğinde oluşturulan blob indirmesini Android tarafına yönlendir.
                view.evaluateJavascript(BLOB_HOOK, null);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                Intent intent;
                try {
                    intent = params.createIntent();
                    intent.setType("*/*");
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }
                try {
                    startActivityForResult(Intent.createChooser(intent, "Yedek dosyası seç"), REQ_FILE_CHOOSER);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                return true;
            }
        });

        // "Yedek Al" için doğrudan (blob dışı) indirmeleri de yakala.
        web.setDownloadListener((url, ua, disp, mime, len) -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception ignored) {
            }
        });

        if (savedInstanceState == null) {
            web.loadUrl("file:///android_asset/finans.html");
        } else {
            web.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (filePathCallback != null) {
                Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                filePathCallback.onReceiveValue(result);
                filePathCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /** JS'den çağrılan köprü: blob olarak üretilen yedeği dosyaya yazıp paylaşım menüsünü açar. */
    private class Bridge {
        @JavascriptInterface
        public void saveBase64(final String fileName, final String dataUrl) {
            runOnUiThread(() -> {
                try {
                    int comma = dataUrl.indexOf(',');
                    String b64 = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
                    byte[] bytes = Base64.decode(b64, Base64.DEFAULT);

                    File dir = new File(getCacheDir(), "exports");
                    if (!dir.exists()) dir.mkdirs();
                    String safe = (fileName == null || fileName.isEmpty()) ? "yedek.json" : fileName;
                    File out = new File(dir, safe);
                    try (FileOutputStream fos = new FileOutputStream(out)) {
                        fos.write(bytes);
                    }

                    Uri uri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            out);

                    Intent share = new Intent(Intent.ACTION_SEND);
                    share.setType("application/json");
                    share.putExtra(Intent.EXTRA_STREAM, uri);
                    share.putExtra(Intent.EXTRA_TITLE, safe);
                    share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(share, "Yedeği kaydet / paylaş"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Yedek kaydedilemedi", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    // download nitelikli blob bağlantısına yapılan tıklamaları Android köprüsüne yönlendiren enjeksiyon.
    private static final String BLOB_HOOK =
            "(function(){" +
            "  if(window.__blobHook)return;window.__blobHook=1;" +
            "  var orig=HTMLAnchorElement.prototype.click;" +
            "  HTMLAnchorElement.prototype.click=function(){" +
            "    try{" +
            "      if(this.download&&this.href&&this.href.indexOf('blob:')===0){" +
            "        var fn=this.download,href=this.href;" +
            "        fetch(href).then(function(r){return r.blob();}).then(function(b){" +
            "          var rd=new FileReader();" +
            "          rd.onload=function(){AndroidBridge.saveBase64(fn,rd.result);};" +
            "          rd.readAsDataURL(b);" +
            "        });" +
            "        return;" +
            "      }" +
            "    }catch(e){}" +
            "    return orig.apply(this,arguments);" +
            "  };" +
            "})();";
}
