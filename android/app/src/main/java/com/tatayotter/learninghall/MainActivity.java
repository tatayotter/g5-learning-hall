package com.tatayotter.learninghall;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

// server.url from capacitor.config.ts always loads the live Vercel app. A
// cold start with no connection still opens the WebView once the app has
// finished loading online at least once on this phone: the web app's
// service worker (public/sw.js) then serves the saved pages, and offline
// play (docs/offline-mode-plan.md) takes over. Before that first online load
// there is nothing saved to show, so we hand off to NoConnectionActivity
// instead of ever starting the bridge/WebView. If the saved page can't load
// after all, CachingWebViewClient.onReceivedError sends the player there too.
public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    private static final String SEED_PREFS_NAME = "webcache_seed_prefs";
    private static final String SEED_DONE_KEY = "seeded_" + CachingWebViewClient.CACHE_VERSION;
    private static final String SEED_ASSET_DIR = "webcache_seed";
    private static final String OFFLINE_PREFS_NAME = "offline_prefs";
    private static final String LOADED_ONLINE_KEY = "loaded_online";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!isOnline(this) && !hasLoadedOnline(this)) {
            // Bail out before the WebView gets a chance to render/load
            // anything — finish() here happens before the first frame draws,
            // so there's no visible flash of the (now-unreachable) live URL.
            startActivity(new Intent(this, NoConnectionActivity.class));
            finish();
            return;
        }
        // Layers a transparent disk cache under the WebView for static
        // assets and Next.js's content-hashed JS/CSS chunks — see
        // CachingWebViewClient's own header comment for why this replaces
        // the bundle-in-APK/cache-on-first-load/service-worker options.
        // Must extend (not replace) Capacitor's own BridgeWebViewClient so
        // the plugin bridge, deep links, and error handling keep working.
        this.bridge.getWebView().setWebViewClient(new CachingWebViewClient(this.bridge));
        seedWebCacheIfNeeded();
    }

    // One-time copy of the curated asset pack bundled into the APK (see
    // scripts/prepare-webcache-seed.js) into the same cache directory
    // CachingWebViewClient reads from — so even a brand-new install's first
    // screen has instant local chrome/music instead of waiting on network.
    // Filenames are pre-hashed at build time to exactly match what
    // CachingWebViewClient computes at runtime, so this is a plain file copy,
    // no re-hashing needed here. Runs on a background thread since it's
    // pure file I/O with no UI dependency — a slow first run just means the
    // seed isn't ready for the very first few requests, which fall back to
    // network exactly like any other cache miss.
    private void seedWebCacheIfNeeded() {
        SharedPreferences prefs = getSharedPreferences(SEED_PREFS_NAME, MODE_PRIVATE);
        if (prefs.getBoolean(SEED_DONE_KEY, false)) return;

        new Thread(() -> {
            try {
                AssetManager assets = getAssets();
                String[] names = assets.list(SEED_ASSET_DIR);
                if (names != null && names.length > 0) {
                    File destDir = new File(getCacheDir(), CachingWebViewClient.CACHE_ROOT_DIR_NAME + "/" + CachingWebViewClient.CACHE_VERSION);
                    destDir.mkdirs();
                    for (String name : names) {
                        File destFile = new File(destDir, name);
                        if (destFile.exists() && destFile.length() > 0) continue;
                        try (InputStream in = assets.open(SEED_ASSET_DIR + "/" + name);
                             OutputStream out = new FileOutputStream(destFile)) {
                            byte[] buffer = new byte[8192];
                            int read;
                            while ((read = in.read(buffer)) != -1) {
                                out.write(buffer, 0, read);
                            }
                        }
                    }
                }
                prefs.edit().putBoolean(SEED_DONE_KEY, true).apply();
            } catch (IOException e) {
                Log.w(TAG, "Web cache seeding failed (non-fatal — assets just cache on first use instead)", e);
            }
        }).start();
    }

    // Set by CachingWebViewClient each time a page finishes loading while
    // online, i.e. once the service worker has had a chance to save the app.
    static void markLoadedOnline(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(OFFLINE_PREFS_NAME, MODE_PRIVATE);
        if (!prefs.getBoolean(LOADED_ONLINE_KEY, false)) {
            prefs.edit().putBoolean(LOADED_ONLINE_KEY, true).apply();
        }
    }

    static boolean hasLoadedOnline(Context context) {
        return context.getSharedPreferences(OFFLINE_PREFS_NAME, MODE_PRIVATE).getBoolean(LOADED_ONLINE_KEY, false);
    }

    static boolean isOnline(Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
        if (caps == null) return false;
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
            || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
            || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET);
    }
}
