package com.photopick.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.ImageDecoder;
import android.graphics.Insets;
import android.media.ExifInterface;
import android.location.Geocoder;
import android.location.Address;
import android.os.Build;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends Activity {
    private static final String HOST = "app.photopick.local";
    private static final int FOLDER = 10, FILES = 11;
    private WebView web;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ExecutorService locationWorker = Executors.newSingleThreadExecutor();
    private final Map<String, Photo> photos = new ConcurrentHashMap<>();
    private final AtomicBoolean cancelled = new AtomicBoolean();
    private volatile boolean saving = false;

    private static class Photo {
        String key, name, path;
        Uri uri;
        long size, mtime;
        String captureDate = "", capturedAt = "";
        double[] coordinates;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(android.graphics.Color.WHITE);
        container.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(container);
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        container.requestApplyInsets();
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.addJavascriptInterface(new Bridge(), "PhotoPickAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !HOST.equals(r.getUrl().getHost());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri uri = r.getUrl();
                if (!HOST.equals(uri.getHost())) return empty(403);
                try {
                    String path = uri.getPath();
                    if (path != null && path.startsWith("/photo/")) {
                        Photo p = photos.get(path.substring(7));
                        if (p == null) return empty(404);
                        Bitmap bitmap = ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(), p.uri),
                                (decoder, info, source) -> {
                                    int side = Math.max(info.getSize().getWidth(), info.getSize().getHeight());
                                    int maxSide = "1".equals(uri.getQueryParameter("detail")) ? 3600 : 1200;
                                    decoder.setTargetSampleSize(Math.max(1, (int)Math.ceil(side / (double)maxSide)));
                                    decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                                });
                        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, bytes);
                        bitmap.recycle();
                        return new WebResourceResponse("image/jpeg", null, new ByteArrayInputStream(bytes.toByteArray()));
                    }
                    if (path == null || path.contains("..")) return empty(403);
                    String file = path.equals("/") ? "index.html" : path.substring(1);
                    String type = file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "application/javascript" : file.endsWith(".png") ? "image/png" : "text/html";
                    return new WebResourceResponse(type, "UTF-8", getAssets().open("www/" + file));
                } catch (Exception e) { return empty(404); }
            }
        });
        web.loadUrl("https://" + HOST + "/");
    }

    private WebResourceResponse empty(int status) {
        return new WebResourceResponse("text/plain", "UTF-8", status, "Unavailable", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    private void event(String name, JSONObject payload) {
        String data = payload.toString().replace("\u2028", "\\u2028").replace("\u2029", "\\u2029");
        runOnUiThread(() -> { if (!isDestroyed()) web.evaluateJavascript("window." + name + "(" + data + ")", null); });
    }

    private JSONObject json(Object... values) {
        JSONObject result = new JSONObject();
        try { for (int i = 0; i < values.length; i += 2) result.put((String)values[i], values[i + 1]); }
        catch (Exception ignored) { }
        return result;
    }

    public class Bridge {
        @JavascriptInterface public void chooseFolder() { choose(FOLDER); }
        @JavascriptInterface public void chooseAnotherFolder() { runOnUiThread(() -> openFolderPicker()); }
        @JavascriptInterface public void describePlaces(String keys) {
            locationWorker.execute(() -> {
                JSONObject places = new JSONObject();
                try {
                    JSONArray ids = new JSONArray(keys);
                    Geocoder geocoder = new Geocoder(MainActivity.this, java.util.Locale.KOREAN);
                    if (Geocoder.isPresent()) for (int i = 0; i < ids.length(); i++) {
                        Photo p = photos.get(ids.getString(i));
                        if (p == null || p.coordinates == null) continue;
                        try {
                            List<Address> found = geocoder.getFromLocation(p.coordinates[0], p.coordinates[1], 1);
                            if (found != null && !found.isEmpty()) {
                                Address address = found.get(0);
                                String area = address.getSubLocality() != null ? address.getSubLocality() : address.getLocality();
                                String region = address.getAdminArea();
                                String text = ((region == null ? "" : region) + " " + (area == null ? "" : area)).trim();
                                if (!text.isEmpty()) places.put(p.key, text);
                            }
                        } catch (Exception ignored) { }
                    }
                } catch (Exception ignored) { }
                event("onNativePlaces", json("places", places));
            });
        }
        @JavascriptInterface public void chooseFiles() { choose(FILES); }
        @JavascriptInterface public void savePhotos(String keys) {
            synchronized (MainActivity.this) {
                if (saving) return;
                saving = true;
                cancelled.set(false);
            }
            worker.execute(() -> save(keys));
        }
        @JavascriptInterface public void cancelSave() { cancelled.set(true); }
        @JavascriptInterface public void closeApp() { runOnUiThread(() -> { if (!saving) finish(); }); }
    }

    private void choose(int request) {
        runOnUiThread(() -> {
            if (saving) return;
            if (request == FOLDER) {
                String previous = getPreferences(MODE_PRIVATE).getString("lastFolder", "");
                if (!previous.isEmpty()) {
                    event("onNativeReading", json());
                    worker.execute(() -> {
                        Uri root = Uri.parse(previous);
                        try (Cursor cursor = getContentResolver().query(DocumentsContract.buildDocumentUriUsingTree(root,
                                DocumentsContract.getTreeDocumentId(root)), null, null, null, null)) {
                            if (cursor == null || !cursor.moveToFirst()) throw new IllegalStateException();
                            scan(java.util.Collections.singletonList(root), true);
                        } catch (Exception e) { runOnUiThread(() -> { event("onNativeCancel", json()); openFolderPicker(); }); }
                    });
                } else openFolderPicker();
                return;
            }
            Intent intent = new Intent(request == FOLDER ? Intent.ACTION_OPEN_DOCUMENT_TREE : Intent.ACTION_OPEN_DOCUMENT);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            if (request == FILES) {
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/jpeg");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            }
            try { startActivityForResult(intent, request); }
            catch (Exception e) { event("onNativeError", json("message", "사진 선택 화면을 열 수 없어요.")); }
        });
    }

    private void openFolderPicker() {
        if (saving) return;
        List<StorageVolume> volumes = new ArrayList<>();
        StorageManager manager = (StorageManager)getSystemService(STORAGE_SERVICE);
        for (StorageVolume volume : manager.getStorageVolumes())
            if (volume.isRemovable() && android.os.Environment.MEDIA_MOUNTED.equals(volume.getState())) volumes.add(volume);
        if (volumes.size() > 1) {
            String[] names = new String[volumes.size()];
            for (int i = 0; i < names.length; i++) names[i] = volumes.get(i).getDescription(this);
            new AlertDialog.Builder(this).setTitle("연결된 저장소 선택").setItems(names,
                    (dialog, index) -> launchFolder(volumes.get(index))).setNegativeButton("취소", null).show();
        } else launchFolder(volumes.isEmpty() ? null : volumes.get(0));
    }

    private void launchFolder(StorageVolume volume) {
        Intent intent = volume == null ? new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE) : volume.createOpenDocumentTreeIntent();
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try { startActivityForResult(intent, FOLDER); }
        catch (Exception e) { event("onNativeError", json("message", "사진 폴더 선택 화면을 열 수 없어요.")); }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != FOLDER && request != FILES) return;
        if (result != RESULT_OK || data == null) { event("onNativeCancel", json()); return; }
        List<Uri> selected = new ArrayList<>();
        if (data.getClipData() != null) for (int i = 0; i < data.getClipData().getItemCount(); i++) selected.add(data.getClipData().getItemAt(i).getUri());
        else if (data.getData() != null) selected.add(data.getData());
        for (Uri uri : selected) {
            try {
                if ((data.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0)
                    getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
            catch (SecurityException ignored) { }
        }
        if (request == FOLDER && !selected.isEmpty()) getPreferences(MODE_PRIVATE).edit().putString("lastFolder", selected.get(0).toString()).apply();
        event("onNativeReading", json());
        worker.execute(() -> scan(selected, request == FOLDER));
    }

    private String key(Uri uri) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(uri.toString().getBytes(StandardCharsets.UTF_8));
        StringBuilder value = new StringBuilder();
        for (byte b : hash) value.append(String.format("%02x", b));
        return value.toString();
    }

    private void add(List<Photo> found, Uri uri, String name, long size, long mtime, String path) throws Exception {
        if (name == null || !name.toLowerCase(java.util.Locale.ROOT).matches(".*\\.jpe?g$")) return;
        Photo photo = new Photo();
        photo.key = key(uri); photo.uri = uri; photo.name = name;
        photo.path = path; photo.size = Math.max(0, size); photo.mtime = Math.max(0, mtime);
        found.add(photo);
        if (found.size() % 100 == 0) event("onNativeReadingProgress", json("discovered", found.size()));
    }

    private void readMetadata(Photo photo) {
        try (InputStream input = getContentResolver().openInputStream(photo.uri)) {
            if (input != null) {
                ExifInterface exif = new ExifInterface(input);
                String date = exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL);
                if (date != null && date.matches("\\d{4}:\\d{2}:\\d{2} \\d{2}:\\d{2}:\\d{2}")) {
                    java.text.SimpleDateFormat parser = new java.text.SimpleDateFormat("yyyy:MM:dd HH:mm:ss", java.util.Locale.ROOT);
                    parser.setLenient(false);
                    if (parser.parse(date) != null) {
                        photo.captureDate = date.substring(0, 10).replace(':', '-');
                        photo.capturedAt = date;
                    }
                }
                float[] location = new float[2];
                if (exif.getLatLong(location)) photo.coordinates = new double[]{location[0], location[1]};
            }
        } catch (Exception ignored) { }
    }

    private void scan(List<Uri> selected, boolean tree) {
        List<Photo> found = new ArrayList<>();
        String folderName = "선택한 사진";
        try {
            if (tree && !selected.isEmpty()) {
                Uri root = selected.get(0);
                String rootId = DocumentsContract.getTreeDocumentId(root);
                Uri rootDocument = DocumentsContract.buildDocumentUriUsingTree(root, rootId);
                try (Cursor c = getContentResolver().query(rootDocument, null, null, null, null)) {
                    if (c != null && c.moveToFirst()) folderName = string(c, DocumentsContract.Document.COLUMN_DISPLAY_NAME, "SD카드");
                }
                ArrayDeque<String[]> dirs = new ArrayDeque<>();
                dirs.add(new String[]{rootId, folderName});
                java.util.HashSet<String> seen = new java.util.HashSet<>();
                while (!dirs.isEmpty()) {
                    if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
                    String[] dir = dirs.removeFirst();
                    if (!seen.add(dir[0])) continue;
                    Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(root, dir[0]);
                    try (Cursor c = getContentResolver().query(children, null, null, null, null)) {
                        if (c == null) continue;
                        while (c.moveToNext()) {
                            String id = string(c, DocumentsContract.Document.COLUMN_DOCUMENT_ID, "");
                            String name = string(c, DocumentsContract.Document.COLUMN_DISPLAY_NAME, "");
                            String path = dir[1] + "/" + name;
                            if (DocumentsContract.Document.MIME_TYPE_DIR.equals(string(c, DocumentsContract.Document.COLUMN_MIME_TYPE, ""))) dirs.add(new String[]{id, path});
                            else add(found, DocumentsContract.buildDocumentUriUsingTree(root, id), name,
                                    number(c, DocumentsContract.Document.COLUMN_SIZE), number(c, DocumentsContract.Document.COLUMN_LAST_MODIFIED), path);
                        }
                    }
                }
            } else {
                for (Uri uri : selected) {
                    try (Cursor c = getContentResolver().query(uri, null, null, null, null)) {
                        if (c != null && c.moveToFirst()) add(found, uri, string(c, OpenableColumns.DISPLAY_NAME, ""),
                                number(c, OpenableColumns.SIZE), number(c, DocumentsContract.Document.COLUMN_LAST_MODIFIED), uri.toString());
                    }
                }
            }
            event("onNativeReadingProgress", json("completed", 0, "total", found.size()));
            for (int i = 0; i < found.size(); i++) {
                if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
                readMetadata(found.get(i));
                if ((i + 1) % 10 == 0 || i + 1 == found.size())
                    event("onNativeReadingProgress", json("completed", i + 1, "total", found.size()));
            }
            JSONArray list = new JSONArray();
            for (Photo photo : found) {
                photos.put(photo.key, photo);
                list.put(json("key", photo.key, "name", photo.name, "path", photo.path, "size", photo.size, "mtime", photo.mtime,
                        "captureDate", photo.captureDate, "capturedAt", photo.capturedAt, "hasLocation", photo.coordinates != null,
                        "url", "https://" + HOST + "/photo/" + photo.key));
            }
            event("onNativePhotos", json("folderName", folderName, "photos", list));
        } catch (Exception e) { event("onNativeError", json("message", "사진을 읽을 수 없어요. SD카드 연결과 폴더 접근 권한을 확인해 주세요.")); }
    }

    private String string(Cursor c, String column, String fallback) { int i = c.getColumnIndex(column); return i < 0 || c.isNull(i) ? fallback : c.getString(i); }
    private long number(Cursor c, String column) { int i = c.getColumnIndex(column); return i < 0 || c.isNull(i) ? 0 : c.getLong(i); }

    private void save(String keysJson) {
        int savedCount = 0, skipped = 0, failed = 0;
        JSONArray failures = new JSONArray();
        try {
            JSONArray keys = new JSONArray(keysJson);
            if (keys.length() == 0) throw new IllegalArgumentException();
            for (int i = 0; i < keys.length(); i++) {
                if (cancelled.get() || Thread.currentThread().isInterrupted()) break;
                Photo photo = photos.get(keys.getString(i));
                if (photo == null) { failed++; failures.put("사진 접근 권한이 없어요"); continue; }
                String signature = photo.key + ":" + photo.size + ":" + photo.mtime;
                String previous = getPreferences(MODE_PRIVATE).getString(signature, null);
                boolean exists = false;
                if (previous != null) try (InputStream stream = getContentResolver().openInputStream(Uri.parse(previous))) { exists = stream != null; } catch (Exception ignored) { }
                if (exists) { skipped++; }
                else {
                    Uri destination = null;
                    try {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Images.Media.DISPLAY_NAME, photo.name.replaceAll("[\\\\/\\p{Cntrl}]", "_"));
                        values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                        values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Photo Pick");
                        values.put(MediaStore.Images.Media.IS_PENDING, 1);
                        destination = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                        if (destination == null) throw new java.io.IOException();
                        try (InputStream input = getContentResolver().openInputStream(photo.uri); OutputStream output = getContentResolver().openOutputStream(destination)) {
                            if (input == null || output == null) throw new java.io.IOException();
                            byte[] buffer = new byte[65536]; int length;
                            while ((length = input.read(buffer)) != -1) {
                                if (cancelled.get() || Thread.currentThread().isInterrupted()) throw new InterruptedException();
                                output.write(buffer, 0, length);
                            }
                            output.flush();
                        }
                        values.clear(); values.put(MediaStore.Images.Media.IS_PENDING, 0);
                        if (getContentResolver().update(destination, values, null, null) != 1) throw new java.io.IOException();
                        getPreferences(MODE_PRIVATE).edit().putString(signature, destination.toString()).apply();
                        savedCount++;
                    } catch (Exception e) {
                        if (destination != null) try { getContentResolver().delete(destination, null, null); } catch (Exception ignored) { }
                        if (cancelled.get() || e instanceof InterruptedException) break;
                        failed++; failures.put(photo.name);
                    }
                }
                event("onNativeSaveProgress", json("completed", savedCount + skipped + failed, "total", keys.length()));
            }
            event("onNativeSaveComplete", json("saved", savedCount, "skipped", skipped, "failed", failed,
                    "cancelled", cancelled.get(), "failures", failures));
        } catch (Exception e) { event("onNativeError", json("message", "사진을 저장할 수 없어요. 저장 공간과 SD카드 연결을 확인해 주세요.")); }
        finally { saving = false; }
    }

    @Override public void onBackPressed() { web.evaluateJavascript("window.nativeBack && window.nativeBack()", null); }
    @Override protected void onDestroy() { cancelled.set(true); worker.shutdownNow(); locationWorker.shutdownNow(); web.removeJavascriptInterface("PhotoPickAndroid"); web.destroy(); super.onDestroy(); }
}
