package com.tatayotter.learninghall;

import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Transparent disk cache layered under the online WebView (which loads the
// live https://learninghall.vercel.app directly — see MainActivity.java's
// comment on why webDir/www is otherwise inert while online). Covers what
// was originally three separate ideas (bundle-in-APK, cache-on-first-load,
// service-worker-equivalent) with one mechanism, since Android WebView's own
// Service Worker support is unreliable for this remote-origin setup and no
// SW infra exists in this repo:
//
//  - /_next/static/immutable/** — Next.js content-hashes these filenames, so
//    once fetched they never change. Cached forever, no revalidation needed.
//  - everything else matching a static-asset file extension (images/audio/
//    fonts under public/) — not content-hashed, so cached under a
//    version-namespaced directory (CACHE_VERSION below); bump that constant
//    by hand if assets are known to have changed, rather than adding
//    conditional-request/ETag complexity for a small, rarely-changing set.
//
// Cache hits are served from disk instantly, skipping the network entirely.
// Cache misses are NOT intercepted (this returns null so the WebView's own
// network stack handles the real request, correctly, with no risk of this
// class mishandling headers/redirects/cookies/TLS) — a background task just
// fetches + writes the same URL to disk afterward, so the *next* load is
// instant. First load after a fresh install or a new deploy still pays the
// normal network cost once, same as any browser cache.
public class CachingWebViewClient extends BridgeWebViewClient {

    private static final String TAG = "CachingWebViewClient";
    // Public so MainActivity's first-launch seed step (see
    // scripts/prepare-webcache-seed.js) writes into the exact same bucket
    // this class reads from, without a second hardcoded copy of the string
    // to keep in sync.
    public static final String CACHE_VERSION = "v1";
    public static final String CACHE_ROOT_DIR_NAME = "webassets";
    private static final String IMMUTABLE_PREFIX = "/_next/static/immutable/";

    // Extension allowlist for the "static assets" group — deliberately
    // extension-based rather than a hardcoded list of public/ subfolders, so
    // new asset directories added later are covered automatically without a
    // native code change. Covers every format seen under public/ (webp/png/
    // svg/gif for graphics, mp3/wav for audio) plus common font formats.
    private static final Set<String> CACHEABLE_EXTENSIONS = new HashSet<>();
    static {
        CACHEABLE_EXTENSIONS.add("webp");
        CACHEABLE_EXTENSIONS.add("png");
        CACHEABLE_EXTENSIONS.add("jpg");
        CACHEABLE_EXTENSIONS.add("jpeg");
        CACHEABLE_EXTENSIONS.add("gif");
        CACHEABLE_EXTENSIONS.add("svg");
        CACHEABLE_EXTENSIONS.add("ico");
        CACHEABLE_EXTENSIONS.add("mp3");
        CACHEABLE_EXTENSIONS.add("wav");
        CACHEABLE_EXTENSIONS.add("ogg");
        CACHEABLE_EXTENSIONS.add("woff");
        CACHEABLE_EXTENSIONS.add("woff2");
        CACHEABLE_EXTENSIONS.add("ttf");
        CACHEABLE_EXTENSIONS.add("json"); // e.g. splash-animation.json
    }

    private static final Map<String, String> MIME_TYPES = new HashMap<>();
    static {
        MIME_TYPES.put("webp", "image/webp");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("mp3", "audio/mpeg");
        MIME_TYPES.put("wav", "audio/wav");
        MIME_TYPES.put("ogg", "audio/ogg");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("ttf", "font/ttf");
        MIME_TYPES.put("json", "application/json");
        MIME_TYPES.put("js", "application/javascript");
        MIME_TYPES.put("css", "text/css");
    }

    private final File cacheRoot;
    private final ExecutorService backgroundFetchExecutor = Executors.newFixedThreadPool(2);

    public CachingWebViewClient(Bridge bridge) {
        super(bridge);
        this.cacheRoot = new File(bridge.getContext().getCacheDir(), CACHE_ROOT_DIR_NAME);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return super.shouldInterceptRequest(view, request);
        }

        String url = request.getUrl().toString();
        String path = request.getUrl().getPath();
        if (path == null) {
            return super.shouldInterceptRequest(view, request);
        }

        boolean immutable = path.startsWith(IMMUTABLE_PREFIX);
        String extension = extensionOf(path);
        boolean cacheableAsset = !immutable && extension != null && CACHEABLE_EXTENSIONS.contains(extension);

        if (!immutable && !cacheableAsset) {
            return super.shouldInterceptRequest(view, request);
        }

        File cacheFile = cacheFileFor(url, immutable, extension);
        if (cacheFile.exists() && cacheFile.length() > 0) {
            try {
                String mimeType = mimeTypeFor(extension);
                return new WebResourceResponse(mimeType, null, new FileInputStream(cacheFile));
            } catch (IOException e) {
                Log.w(TAG, "Cache hit but failed to open " + cacheFile + ", falling back to network", e);
                // Fall through to network below.
            }
        }

        // Cache miss — don't intercept; let the WebView make the real
        // request (correct handling of headers/redirects/cookies/TLS), and
        // separately fetch+cache the same URL in the background so the next
        // load of this exact URL is instant.
        fetchAndCacheInBackground(url, cacheFile);
        return super.shouldInterceptRequest(view, request);
    }

    private void fetchAndCacheInBackground(String url, File cacheFile) {
        backgroundFetchExecutor.submit(() -> {
            HttpURLConnection connection = null;
            try {
                cacheFile.getParentFile().mkdirs();
                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.setInstanceFollowRedirects(true);
                int status = connection.getResponseCode();
                if (status != HttpURLConnection.HTTP_OK) {
                    return;
                }
                // Write to a temp file then rename — avoids a half-written
                // file being served as a "hit" if the app is killed mid-download.
                File tempFile = new File(cacheFile.getParentFile(), cacheFile.getName() + ".part");
                try (InputStream in = connection.getInputStream(); OutputStream out = new FileOutputStream(tempFile)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                    }
                }
                if (!tempFile.renameTo(cacheFile)) {
                    tempFile.delete();
                }
            } catch (IOException e) {
                Log.w(TAG, "Background cache fetch failed for " + url + " (will retry next request)", e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    // Filesystem-safe cache filename: a hash of the full URL (path+query),
    // since asset paths can contain characters (spaces, non-ASCII) that
    // aren't safe as-is, plus the original extension so mimeTypeFor() and
    // basic debugging both stay straightforward. Immutable (content-hashed)
    // assets are cached forever under their own subfolder; everything else
    // sits under the version-namespaced folder so bumping CACHE_VERSION
    // invalidates the lot at once.
    private File cacheFileFor(String url, boolean immutable, String extension) {
        String bucket = immutable ? "immutable" : CACHE_VERSION;
        String name = sha256Hex(url) + (extension != null ? "." + extension : "");
        return new File(new File(cacheRoot, bucket), name);
    }

    private static String extensionOf(String path) {
        int slash = path.lastIndexOf('/');
        String filename = slash >= 0 ? path.substring(slash + 1) : path;
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return null;
        return filename.substring(dot + 1).toLowerCase();
    }

    private static String mimeTypeFor(String extension) {
        String mime = extension != null ? MIME_TYPES.get(extension) : null;
        return mime != null ? mime : "application/octet-stream";
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            // MessageDigest/UTF-8 are always available on Android — this is
            // unreachable in practice, but fall back to hashCode() rather
            // than propagating a checked exception through a cache-key helper.
            return Integer.toHexString(input.hashCode());
        }
    }
}
