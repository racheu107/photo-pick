package com.photopick.app;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.nio.file.Files;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.HttpURLConnection;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

/** Run with adb shell am instrument -w com.photopick.app.test/com.photopick.app.UpdaterChecks. */
public class UpdaterChecks extends Instrumentation {
    private Bundle arguments;
    @Override public void onCreate(Bundle args) { arguments=args; start(); }
    private void require(boolean value, String message) { if (!value) throw new AssertionError(message); }
    private JSONObject release(String version, boolean draft, String assetName) throws Exception {
        String tag="android-v"+version+"-preview";
        JSONObject asset=new JSONObject().put("name",assetName).put("size",100).put("state","uploaded")
                .put("browser_download_url","https://github.com/racheu107/photo-pick/releases/download/"+tag+"/"+assetName);
        return new JSONObject().put("draft",draft).put("tag_name",tag).put("prerelease",true).put("assets",new JSONArray().put(asset));
    }
    @Override public void onStart() {
        Bundle result=new Bundle(); AppUpdater updater=null;
        try {
            JSONArray releases=new JSONArray().put(release("0.2.1",false,"PhotoPick-0.2.1-debug.apk"))
                    .put(release("0.2.9",true,"PhotoPick-0.2.9-debug.apk"))
                    .put(release("0.2.4",false,"wrong.apk"))
                    .put(release("0.2.3",false,"PhotoPick-0.2.3-debug.apk"));
            require(AppUpdater.latest(releases,"0.2.2").getString("version").equals("0.2.3"),"Latest includes preview, excludes draft/wrong asset");
            require(AppUpdater.latest(releases,"0.2.3")==null,"No downgrade/repeat offer");
            require(AppUpdater.compareVersion("0.2.10","0.2.9")>0,"Numeric version comparison");
            JSONObject wrong=release("0.2.5",false,"PhotoPick-0.2.5-debug.apk");
            wrong.getJSONArray("assets").getJSONObject(0).put("browser_download_url","https://evil.example/app.apk");
            require(AppUpdater.latest(new JSONArray().put(wrong),"0.2.2")==null,"Untrusted asset rejected");
            Activity activity=startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            updater=new AppUpdater(activity);
            Field workerField=AppUpdater.class.getDeclaredField("worker"); workerField.setAccessible(true);
            ExecutorService worker=(ExecutorService)workerField.get(updater); worker.submit(()->{}).get(10,TimeUnit.SECONDS);
            File folder=new File(activity.getCacheDir(),"updates"); folder.mkdirs();
            File same=new File(folder,"same.apk"); Files.copy(new File(activity.getApplicationInfo().sourceDir).toPath(),same.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            boolean rejected=false; try { updater.verify(same,"0.2.2"); } catch(SecurityException e) { rejected=true; }
            require(rejected,"Installed version cannot be installed again");
            File part=new File(folder,"incomplete.part"); Files.write(part.toPath(),new byte[]{1,2,3});
            File bad=new File(folder,"bad.apk"); Files.write(bad.toPath(),new byte[]{1,2,3});
            updater.cleanup(); require(!same.exists()&&!part.exists()&&!bad.exists(),"Installed, partial and invalid APKs cleaned");
            UpdateFileProvider provider=new UpdateFileProvider(); provider.attachInfo(activity,new android.content.pm.ProviderInfo());
            rejected=false; try { provider.openFile(Uri.parse("content://com.photopick.app.updates/../secret"),"r"); } catch(java.io.FileNotFoundException e) { rejected=true; }
            require(rejected,"Provider denies arbitrary paths");
            rejected=false; try { provider.openFile(Uri.parse("content://com.photopick.app.updates/update.apk"),"rw"); } catch(java.io.FileNotFoundException e) { rejected=true; }
            require(rejected,"Provider denies writes");
            Method connect=AppUpdater.class.getDeclaredMethod("connect",String.class);connect.setAccessible(true);
            HttpURLConnection connection=(HttpURLConnection)connect.invoke(null,"https://api.github.com/repos/racheu107/photo-pick/releases?per_page=100");
            require(connection.getResponseCode()==200,"Actual GitHub API connectivity"); connection.disconnect();
            if (arguments!=null && arguments.containsKey("download")) {
                HttpURLConnection api=(HttpURLConnection)connect.invoke(null,"https://api.github.com/repos/racheu107/photo-pick/releases/tags/android-v0.2.1-preview");
                JSONObject asset;
                try(java.io.InputStream input=api.getInputStream()) {
                    java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream(); byte[] buffer=new byte[8192];int n;
                    while((n=input.read(buffer))!=-1)out.write(buffer,0,n);
                    asset=new JSONObject(out.toString("UTF-8")).getJSONArray("assets").getJSONObject(0);
                } finally {api.disconnect();}
                JSONObject download=new JSONObject().put("version","0.2.1").put("url",asset.getString("browser_download_url"))
                        .put("size",asset.getLong("size")).put("digest",asset.optString("digest"));
                Method method=AppUpdater.class.getDeclaredMethod("download",JSONObject.class);method.setAccessible(true);
                AppUpdater selected=updater;runOnMainSync(()->{try{method.invoke(selected,download);}catch(Exception e){throw new RuntimeException(e);}});
                worker.submit(()->{}).get(90,TimeUnit.SECONDS);
                require(!new File(folder,"update.part").exists()&&!new File(folder,"update.apk").exists(),"Actual APK download rejects older version and deletes temporary file");
            }
            if (arguments!=null && arguments.containsKey("futureApk")) {
                File future=new File(arguments.getString("futureApk")); updater.verify(future,"0.2.3");
                File target=new File(folder,"update.apk"); Files.copy(future.toPath(),target.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                updater.cleanup(); require(target.exists(),"Fresh uninstalled APK retained");
                target.setLastModified(System.currentTimeMillis()-49L*60*60*1000); updater.cleanup();require(!target.exists(),"Cancelled stale APK cleaned after 48h");
                Files.copy(future.toPath(),target.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                Field pending=AppUpdater.class.getDeclaredField("pending");pending.setAccessible(true);pending.set(updater,target);
                Method install=AppUpdater.class.getDeclaredMethod("install"); install.setAccessible(true);
                AppUpdater selected=updater;runOnMainSync(()->{try{install.invoke(selected);}catch(Exception e){throw new RuntimeException(e);}});
                android.os.SystemClock.sleep(45000);
            }
            result.putString("stream","PASS: preview selection, numeric versions, source restriction, installed version rejection, cache cleanup, private read-only provider, real GitHub API.\n");
            finish(Activity.RESULT_OK,result);
        } catch(Throwable e) { result.putString("stream","FAIL: "+android.util.Log.getStackTraceString(e));finish(Activity.RESULT_CANCELED,result); }
        // Leave optional installer handoff alive until the system takes its URI grant.
        finally { if(updater!=null && (arguments==null || !arguments.containsKey("futureApk"))) { AppUpdater selected=updater;runOnMainSync(selected::destroy); } }
    }
}
