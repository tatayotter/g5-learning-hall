package com.tatayotter.g5learninghall;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.widget.Button;
import android.widget.Toast;

// Shown instead of MainActivity whenever the device has no connection at
// cold start (see MainActivity.onCreate) — this app is online-only, so
// there is no local webDir fallback to show. "Try Again" just re-checks
// connectivity and, once online, hands off to MainActivity as normal.
public class NoConnectionActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_no_connection);

        Button retryButton = findViewById(R.id.retry_button);
        retryButton.setOnClickListener(v -> {
            if (isOnline()) {
                startActivity(new Intent(this, MainActivity.class));
                finish();
            } else {
                Toast.makeText(this, R.string.no_connection_message, Toast.LENGTH_SHORT).show();
            }
        });
    }

    // Re-checks connectivity every time this screen comes back to the
    // foreground (e.g. the user connected to Wi-Fi and switched back to the
    // app) — not just on an explicit Retry tap.
    @Override
    protected void onResume() {
        super.onResume();
        if (isOnline()) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
        }
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
