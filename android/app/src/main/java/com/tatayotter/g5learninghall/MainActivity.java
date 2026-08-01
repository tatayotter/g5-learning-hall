package com.tatayotter.g5learninghall;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (!isOnline()) {
            this.config = new CapConfig.Builder(this).setServerUrl(null).create();
        }
        super.onCreate(savedInstanceState);
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
