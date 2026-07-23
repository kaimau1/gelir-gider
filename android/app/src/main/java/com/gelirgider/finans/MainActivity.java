package com.gelirgider.finans;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
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

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * finans.html dosyasını tam ekran bir WebView içinde çalıştıran kabuk uygulama.
 * Ana fikir korunur; ek olarak:
 *  - AndroidBridge.httpGet: CORS'suz native HTTP GET (BIST hisse fiyatı güvenilir çekilir)
 *  - iki parmakla yakınlaştırma (pinch zoom) + yakınlaştırma seviyesinin hatırlanması
 *  - Yedek Al (blob) -> paylaşım menüsü, Yedek Yükle -> native dosya seçici
 */
public class MainActivity extends Activity {

    private static final int REQ_FILE_CHOOSER = 1001;

    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;
    private SharedPreferences prefs;
    private float pendingScale = 0f;
    private boolean scaleRestored = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("butcem_ui", MODE_PRIVATE);
        pendingScale = prefs.getFloat("scale", 0f);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        // İki parmakla yakınlaştırma açık; ekrandaki +/- düğmeleri gizli.
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme();
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
            public void onScaleChanged(WebView view, float oldScale, float newScale) {
                super.onScaleChanged(view, oldScale, newScale);
                // Yakınlaştırma seviyesini yalnızca ilk geri yükleme yapıldıktan sonra sakla.
                if (scaleRestored) {
                    prefs.edit().putFloat("scale", newScale).apply();
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(BLOB_HOOK, null);
                // Son bırakılan yakınlaştırma seviyesini geri yükle (en iyi çaba).
                view.postDelayed(() -> {
                    try {
                        if (pendingScale > 0.1f) {
                            float cur = view.getScale();
                            if (cur > 0f) {
                                float factor = pendingScale / cur;
                                if (factor < 0.02f) factor = 0.02f;
                                if (factor > 50f) factor = 50f;
                                view.zoomBy(factor);
                            }
                        }
                    } catch (Exception ignored) {
                    }
                    scaleRestored = true;
                }, 350);
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

    private class Bridge {
        /** Blob olarak üretilen yedeği dosyaya yazıp paylaşım menüsünü açar. */
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

        /**
         * CORS kısıtı olmadan HTTP GET yapar (BIST hisse fiyatı vb.), sonucu
         * window.__httpResolve(cbId, ok, body) ile JS'e döndürür.
         */
        @JavascriptInterface
        public void httpGet(final String url, final String cbId) {
            new Thread(() -> {
                boolean ok = false;
                String body = "";
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(10000);
                    c.setInstanceFollowRedirects(true);
                    c.setRequestProperty("User-Agent",
                            "Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Butcem");
                    c.setRequestProperty("Accept", "application/json, text/plain, */*");
                    int code = c.getResponseCode();
                    InputStream is = (code >= 200 && code < 400) ? c.getInputStream() : c.getErrorStream();
                    body = readAll(is);
                    ok = (code >= 200 && code < 300);
                } catch (Exception e) {
                    body = String.valueOf(e.getMessage());
                    ok = false;
                } finally {
                    if (c != null) c.disconnect();
                }
                final boolean fok = ok;
                final String fbody = body;
                runOnUiThread(() -> {
                    String js = "window.__httpResolve && window.__httpResolve("
                            + JSONObject.quote(cbId) + "," + fok + "," + JSONObject.quote(fbody) + ");";
                    if (web != null) web.evaluateJavascript(js, null);
                });
            }).start();
        }
    }

    private static String readAll(InputStream is) throws Exception {
        if (is == null) return "";
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = is.read(buf)) != -1) bos.write(buf, 0, n);
        is.close();
        return bos.toString("UTF-8");
    }

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
