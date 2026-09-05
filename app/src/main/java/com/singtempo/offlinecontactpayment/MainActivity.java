package com.singtempo.offlinecontactpayment;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
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
import java.io.OutputStream;

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
                    WebView v,
                    WebResourceRequest r) {

                Uri u = r.getUrl();

                if ("tel".equalsIgnoreCase(u.getScheme())) {
                    startActivity(
                            new Intent(Intent.ACTION_DIAL, u)
                    );
                    return true;
                }

                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView v,
                    String url) {

                if (url.startsWith("tel:")) {
                    startActivity(
                            new Intent(
                                    Intent.ACTION_DIAL,
                                    Uri.parse(url)
                            )
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

        if (
                requestCode == FILE_CHOOSER &&
                fileCallback != null
        ) {

            Uri[] result = null;

            if (
                    resultCode == RESULT_OK &&
                    data != null &&
                    data.getData() != null
            ) {

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
        public void saveExcel(
                String base64,
                String filename
        ) {

            try {

                byte[] bytes =
                        Base64.decode(
                                base64,
                                Base64.DEFAULT
                        );

                /*
                 * Android 10 and newer:
                 * Save directly to public Downloads.
                 */

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                    ContentValues values =
                            new ContentValues();

                    values.put(
                            MediaStore.Downloads.DISPLAY_NAME,
                            filename
                    );

                    values.put(
                            MediaStore.Downloads.MIME_TYPE,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    );

                    values.put(
                            MediaStore.Downloads.RELATIVE_PATH,
                            Environment.DIRECTORY_DOWNLOADS
                    );

                    values.put(
                            MediaStore.Downloads.IS_PENDING,
                            1
                    );

                    Uri uri =
                            getContentResolver().insert(
                                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                                    values
                            );

                    if (uri == null) {
                        throw new Exception(
                                "Could not create Downloads file"
                        );
                    }

                    try (
                            OutputStream output =
                                    getContentResolver()
                                            .openOutputStream(uri)
                    ) {

                        if (output == null) {
                            throw new Exception(
                                    "Could not open Downloads file"
                            );
                        }

                        output.write(bytes);
                    }

                    ContentValues done =
                            new ContentValues();

                    done.put(
                            MediaStore.Downloads.IS_PENDING,
                            0
                    );

                    getContentResolver().update(
                            uri,
                            done,
                            null,
                            null
                    );

                } else {

                    /*
                     * Older Android:
                     * Save directly to public Downloads.
                     */

                    File dir =
                            Environment
                                    .getExternalStoragePublicDirectory(
                                            Environment.DIRECTORY_DOWNLOADS
                                    );

                    if (
                            !dir.exists() &&
                            !dir.mkdirs()
                    ) {
                        throw new Exception(
                                "Could not create Downloads directory"
                        );
                    }

                    File file =
                            new File(
                                    dir,
                                    filename
                            );

                    try (
                            FileOutputStream output =
                                    new FileOutputStream(file)
                    ) {

                        output.write(bytes);
                    }
                }

                runOnUiThread(() ->
                        Toast.makeText(
                                MainActivity.this,
                                "Excel saved to Downloads",
                                Toast.LENGTH_LONG
                        ).show()
                );

            } catch (Exception e) {

                runOnUiThread(() ->
                        Toast.makeText(
                                MainActivity.this,
                                "Export failed: " +
                                        e.getMessage(),
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
