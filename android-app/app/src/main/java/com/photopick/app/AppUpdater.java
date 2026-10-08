package com.photopick.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Native updates never share storage, networking or threads with photo processing. */
final class AppUpdater {
    private static final String RELEASES = "https://api.github.com/repos/racheu107/photo-pick/releases?per_page=100";
    private static final long MAX_BYTES = 100L * 1024 * 1024;
    private final Activity activity;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean(), cancelled = new AtomicBoolean();
    private File pending;
    private AlertDialog dialog;
    private ProgressDialog progress;
    private boolean waitingPermission;
    private volatile boolean destroyed;

    AppUpdater(Activity activity) { this.activity = activity; worker.execute(this::cleanup); }
    private File directory() { return new File(activity.getCacheDir(), "updates"); }
    private PackageInfo installed() throws Exception {
        return activity.getPackageManager().getPackageInfo(activity.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
    }
    void cleanup() {
        File[] files = directory().listFiles();
        if (files == null) return;
        for (File file : files) {
            try {
                PackageInfo info = activity.getPackageManager().getPackageArchiveInfo(file.getPath(), 0);
                if (file.getName().endsWith(".part") || info == null || info.getLongVersionCode() <= installed().getLongVersionCode()
                        || System.currentTimeMillis() - file.lastModified() > 48L * 60 * 60 * 1000) file.delete();
            } catch (Exception ignored) { file.delete(); }
        }
    }
    static int compareVersion(String a, String b) {
        String[] x = a.split("\\."), y = b.split("\\.");
        for (int i = 0; i < 3; i++) {
            int difference = Integer.compare(Integer.parseInt(x[i]), Integer.parseInt(y[i]));
            if (difference != 0) return difference;
        }
        return 0;
    }
    static JSONObject latest(JSONArray releases, String current) throws Exception {
        JSONObject best = null;
        for (int i = 0; i < releases.length(); i++) {
            JSONObject release = releases.getJSONObject(i);
            String tag = release.optString("tag_name");
            if (release.optBoolean("draft") || !tag.matches("android-v\\d{1,6}\\.\\d{1,6}\\.\\d{1,6}(-preview)?")) continue;
            String version = tag.substring(9).replace("-preview", "");
            if (compareVersion(version, current) <= 0 || best != null && compareVersion(version, best.getString("version")) <= 0) continue;
            JSONArray assets = release.optJSONArray("assets");
            if (assets == null) continue;
            for (int j = 0; j < assets.length(); j++) {
                JSONObject asset = assets.getJSONObject(j);
                String expected = "PhotoPick-" + version + "-debug.apk";
                String url = asset.optString("browser_download_url");
                long size = asset.optLong("size");
                if (!expected.equals(asset.optString("name")) || !"uploaded".equals(asset.optString("state"))
                        || size <= 0 || size > MAX_BYTES
                        || !url.equals("https://github.com/racheu107/photo-pick/releases/download/" + tag + "/" + expected)) continue;
                best = new JSONObject().put("version", version).put("url", url).put("size", size).put("digest", asset.optString("digest"));
            }
        }
        return best;
    }
    private boolean alive() { return !destroyed && !activity.isFinishing() && !activity.isDestroyed(); }
    private void ui(Runnable action) { activity.runOnUiThread(() -> { if (alive()) action.run(); }); }
    private void notice(String message) { ui(() -> dialog = new AlertDialog.Builder(activity).setTitle("앱 업데이트").setMessage(message).setPositiveButton("확인", null).show()); }
    void check(boolean manual) {
        if (!busy.compareAndSet(false, true)) return;
        worker.execute(() -> {
            try {
                String current = installed().versionName;
                HttpURLConnection connection = connect(RELEASES);
                JSONObject update;
                try (InputStream input = connection.getInputStream()) {
                    java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
                    byte[] buffer = new byte[8192]; int n;
                    while ((n = input.read(buffer)) != -1) {
                        if (bytes.size() + n > 2 * 1024 * 1024) throw new java.io.IOException();
                        bytes.write(buffer, 0, n);
                    }
                    update = latest(new JSONArray(bytes.toString(StandardCharsets.UTF_8.name())), current);
                } finally { connection.disconnect(); }
                if (update == null) { if (manual) notice("최신 버전이에요. 현재 " + current); return; }
                ui(() -> {
                    // Avoid interrupting a photo session or an existing web dialog.
                    if (activity instanceof MainActivity) ((MainActivity)activity).whenUpdateIdle(manual, () -> offer(update, current));
                });
            } catch (Exception e) { if (manual) notice("버전을 확인하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요."); }
            finally { busy.set(false); }
        });
    }
    private void offer(JSONObject update, String current) {
        if (dialog != null && dialog.isShowing()) return;
        dialog = new AlertDialog.Builder(activity).setTitle("새 버전이 있어요")
                .setMessage(current + " → " + update.optString("version") + "\n업데이트 파일은 앱 임시 공간에 저장되고 설치 후 정리돼요.")
                .setPositiveButton("업데이트", (d, w) -> download(update)).setNegativeButton("나중에", null).show();
    }
    private static HttpURLConnection connect(String address) throws Exception {
        for (int i = 0; i < 6; i++) {
            URL url = new URL(address); String host = url.getHost();
            if (!"https".equals(url.getProtocol()) || !(host.equals("api.github.com") || host.equals("github.com")
                    || host.equals("release-assets.githubusercontent.com") || host.equals("objects.githubusercontent.com"))) throw new java.io.IOException();
            HttpURLConnection c = (HttpURLConnection)url.openConnection();
            c.setConnectTimeout(12000); c.setReadTimeout(20000); c.setInstanceFollowRedirects(false);
            c.setRequestProperty("User-Agent", "PhotoPick-Android");
            c.setRequestProperty("Accept", host.equals("api.github.com") ? "application/vnd.github+json" : "application/octet-stream");
            int status = c.getResponseCode();
            if (status >= 300 && status <= 399) {
                String next = c.getHeaderField("Location"); c.disconnect();
                if (next == null) throw new java.io.IOException();
                address = new URL(url, next).toString(); continue;
            }
            if (status != 200) { c.disconnect(); throw new java.io.IOException(); }
            return c;
        }
        throw new java.io.IOException();
    }
    private void download(JSONObject update) {
        if (!busy.compareAndSet(false, true)) return;
        cancelled.set(false);
        progress = new ProgressDialog(activity); progress.setTitle("업데이트 다운로드");
        progress.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL); progress.setMax(100); progress.setCancelable(false);
        progress.setButton(AlertDialog.BUTTON_NEGATIVE, "취소", (d, w) -> cancelled.set(true)); progress.show();
        worker.execute(() -> {
            File folder = directory(); folder.mkdirs();
            File part = new File(folder, "update.part"), apk = new File(folder, "update.apk");
            try {
                HttpURLConnection connection = connect(update.getString("url"));
                MessageDigest digest = MessageDigest.getInstance("SHA-256"); long count = 0, size = update.getLong("size");
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(part)) {
                    byte[] buffer = new byte[65536]; int n, last = -1;
                    while ((n = input.read(buffer)) != -1) {
                        if (cancelled.get() || destroyed || Thread.currentThread().isInterrupted()) throw new InterruptedException();
                        count += n; if (count > size || count > MAX_BYTES) throw new java.io.IOException();
                        output.write(buffer, 0, n); digest.update(buffer, 0, n);
                        int value = (int)(count * 100 / size);
                        if (value != last) { last = value; ui(() -> progress.setProgress(value)); }
                    }
                    if (count != size || cancelled.get()) throw new java.io.IOException();
                } finally { connection.disconnect(); }
                StringBuilder hash = new StringBuilder(); for (byte value : digest.digest()) hash.append(String.format(java.util.Locale.ROOT, "%02x", value));
                String expected = update.optString("digest");
                if (!expected.isEmpty() && !expected.equals("sha256:" + hash)) throw new SecurityException();
                verify(part, update.getString("version"));
                if (cancelled.get() || destroyed) throw new InterruptedException();
                apk.delete(); if (!part.renameTo(apk)) throw new java.io.IOException();
                pending = apk;
                ui(() -> { progress.dismiss(); install(); });
            } catch (Exception e) {
                part.delete(); ui(() -> progress.dismiss());
                if (!cancelled.get() && !destroyed) notice(e instanceof SecurityException ? "설치 파일의 버전 또는 서명이 맞지 않아 업데이트를 중단했어요." : "다운로드하지 못했어요. 연결과 저장 공간을 확인한 뒤 다시 시도해 주세요.");
            } finally { busy.set(false); }
        });
    }
    void verify(File file, String expected) throws Exception {
        PackageInfo current = installed();
        PackageInfo next = activity.getPackageManager().getPackageArchiveInfo(file.getPath(), PackageManager.GET_SIGNING_CERTIFICATES);
        if (next == null || !activity.getPackageName().equals(next.packageName) || !expected.equals(next.versionName)
                || next.getLongVersionCode() <= current.getLongVersionCode() || next.signingInfo == null
                || !Arrays.equals(current.signingInfo.getApkContentsSigners(), next.signingInfo.getApkContentsSigners())) throw new SecurityException();
    }
    private void install() {
        if (pending == null || !pending.isFile()) { notice("임시 설치 파일이 없어요. 업데이트를 다시 시도해 주세요."); return; }
        if (!activity.getPackageManager().canRequestPackageInstalls()) {
            dialog = new AlertDialog.Builder(activity).setTitle("업데이트 설치 허용")
                    .setMessage("다음 설정에서 Photo Pick의 ‘이 출처 허용’을 켜주세요. 돌아오면 설치 확인창이 열려요.")
                    .setPositiveButton("설정 열기", (d,w) -> {
                        try { waitingPermission = true; activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName()))); }
                        catch (Exception e) { waitingPermission = false; notice("설정 화면을 열 수 없어요."); }
                    }).setNegativeButton("나중에", null).show();
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(Uri.parse("content://" + activity.getPackageName() + ".updates/update.apk"), "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        } catch (Exception e) { notice("설치 확인창을 열 수 없어요. 업데이트를 다시 시도해 주세요."); }
    }
    void resume() { if (waitingPermission) { waitingPermission = false; if (activity.getPackageManager().canRequestPackageInstalls()) install(); } }
    void destroy() { destroyed = true; cancelled.set(true); worker.shutdownNow(); if (progress != null) progress.dismiss(); if (dialog != null) dialog.dismiss(); }
}
