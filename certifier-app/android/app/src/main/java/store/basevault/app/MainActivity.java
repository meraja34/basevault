package store.basevault.app;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private WebView popupWebView;
    private FrameLayout popupContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar and nav bar colors
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#060612"));
        window.setNavigationBarColor(Color.parseColor("#060612"));

        View decorView = window.getDecorView();
        int flags = decorView.getSystemUiVisibility();
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        decorView.setSystemUiVisibility(flags);

        // Setup popup container overlay (for Smart Wallet popups)
        popupContainer = new FrameLayout(this);
        popupContainer.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        popupContainer.setVisibility(View.GONE);
        popupContainer.setBackgroundColor(Color.parseColor("#CC000000"));

        // Add popup container to the root view
        ViewGroup rootView = findViewById(android.R.id.content);
        rootView.addView(popupContainer);

        // Configure WebView for popup support after bridge is ready
        getBridge().getWebView().post(() -> setupWebView());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setDomStorageEnabled(true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                // Create popup WebView for Smart Wallet flow
                popupWebView = createPopupWebView();
                popupContainer.removeAllViews();
                popupContainer.addView(popupWebView);
                popupContainer.setVisibility(View.VISIBLE);

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onCloseWindow(WebView window) {
                dismissPopup();
            }
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private WebView createPopupWebView() {
        WebView popup = new WebView(this);
        popup.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        WebSettings settings = popup.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setUserAgentString(settings.getUserAgentString().replace("; wv", ""));

        popup.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Let coinbase and wallet URLs load inside popup
                if (url.contains("coinbase.com") || url.contains("keys.coinbase.com") ||
                    url.contains("basevault") || url.startsWith("https://")) {
                    return false;
                }
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }
        });

        popup.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onCloseWindow(WebView window) {
                dismissPopup();
            }
        });

        return popup;
    }

    private void dismissPopup() {
        if (popupWebView != null) {
            popupWebView.destroy();
            popupWebView = null;
        }
        if (popupContainer != null) {
            popupContainer.removeAllViews();
            popupContainer.setVisibility(View.GONE);
        }
    }

    @Override
    public void onBackPressed() {
        // If popup is open, close it first
        if (popupContainer != null && popupContainer.getVisibility() == View.VISIBLE) {
            dismissPopup();
            return;
        }
        super.onBackPressed();
    }
}
