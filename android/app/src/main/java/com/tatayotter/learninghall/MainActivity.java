package com.tatayotter.learninghall;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

// Online (unchanged): server.url from capacitor.config.ts loads the live
// Vercel app exactly as before.
//
// Offline: no connection at cold start, so loading the remote server.url
// would just show a network-error page. Instead, fall back to the
// locally-bundled offline shell (a separate, small static export — see
// offline-shell/ and lib/localDataSource.ts). It IS webDir (www/) in its
// entirety — the online path never uses webDir at all (server.url always
// overrides it) — so this just loads webDir's own root index.html, no
// custom start path needed.
public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    private static final String SEED_PREFS_NAME = "webcache_seed_prefs";
    private static final String SEED_DONE_KEY = "seeded_" + CachingWebViewClient.CACHE_VERSION;
    private static final String SEED_ASSET_DIR = "webcache_seed";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (!isOnline()) {
            this.config = new CapConfig.Builder(this).setServerUrl(null).create();
        }
        super.onCreate(savedInstanceState);
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

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
        if (caps == null) return false;
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
            || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
            || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET);
    }
}
