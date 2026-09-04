package com.singtempo.offlinecontactpayment;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private static final int FILE_CHOOSER = 1001;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);

        webView = new WebView(this);
        setContentView(webView);

        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView v, WebResourceRequest r) {

                Uri u = r.getUrl();

                if ("tel".equalsIgnoreCase(u.getScheme())) {
                    startActivity(new Intent(Intent.ACTION_DIAL, u));
                    return true;
                }

                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView v, String url) {

                if (url.startsWith("tel:")) {
                    startActivity(
                        new Intent(Intent.ACTION_DIAL, Uri.parse(url))
                    );
                    return true;
                }

                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public boolean onShowFileChooser(
                    WebView v,
                    ValueCallback<Uri[]> cb,
                    FileChooserParams params) {

                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }

                fileCallback = cb;

                Intent intent = params.createIntent();

                intent.setType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                );

                try {
                    startActivityForResult(
                        intent,
                        FILE_CHOOSER
                    );
                } catch (Exception e) {
                    fileCallback = null;
                    cb.onReceiveValue(null);
                }

                return true;
            }
        });

        webView.addJavascriptInterface(
            new AndroidBridge(),
            "AndroidBridge"
        );

        webView.loadUrl(
            "file:///android_asset/index.html"
        );
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data) {

        super.onActivityResult(
            requestCode,
            resultCode,
            data
        );

        if (requestCode == FILE_CHOOSER &&
            fileCallback != null) {

            Uri[] result = null;

            if (resultCode == RESULT_OK &&
                data != null &&
                data.getData() != null) {

                result = new Uri[]{
                    data.getData()
                };
            }

            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }

    public class AndroidBridge {

        @JavascriptInterface
        public void saveXlsx(
                String base64,
                String filename) {

            try {

                byte[] bytes =
                    Base64.decode(
                        base64,
                        Base64.DEFAULT
                    );

                File dir =
                    getExternalFilesDir(
                        Environment.DIRECTORY_DOCUMENTS
                    );

                if (dir == null) {
                    dir = getFilesDir();
                }

                File file =
                    new File(dir, filename);

                FileOutputStream output =
                    new FileOutputStream(file);

                output.write(bytes);
                output.close();

                runOnUiThread(() ->
                    Toast.makeText(
                        MainActivity.this,
                        "Excel saved",
                        Toast.LENGTH_LONG
                    ).show()
                );

            } catch (Exception e) {

                runOnUiThread(() ->
                    Toast.makeText(
                        MainActivity.this,
                        "Export failed",
                        Toast.LENGTH_LONG
                    ).show()
                );
            }
        }
    }

    @Override
    public void onBackPressed() {

        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
