package com.photopick.app;
import org.json.JSONArray;
import org.json.JSONObject;
public class ReleaseSelectionChecks {
    private static int cases;
    private static void require(boolean ok,String message){cases++;if(!ok)throw new AssertionError(message);}
    private static JSONObject release(String version,boolean design,boolean draft) throws Exception {
        String tag=(design?"design-v":"android-v")+version+(design?"":"-preview");
        String name=design?"PhotoPick-DesignPreview-"+version+".apk":"PhotoPick-"+version+"-debug.apk";
        JSONObject asset=new JSONObject().put("name",name).put("state","uploaded").put("size",100)
            .put("digest","sha256:"+"0".repeat(64)).put("browser_download_url","https://github.com/racheu107/photo-pick/releases/download/"+tag+"/"+name);
        return new JSONObject().put("tag_name",tag).put("draft",draft).put("prerelease",true).put("assets",new JSONArray().put(asset));
    }
    private static JSONObject asset(JSONObject r) throws Exception {return r.getJSONArray("assets").getJSONObject(0);}
    public static void main(String[] args) throws Exception {
        JSONArray mixed=new JSONArray().put(release("0.2.18",true,false)).put(release("9.0.0",false,false)).put(release("0.2.20",true,true)).put(release("0.2.19",true,false));
        require(AppUpdater.latest(mixed,"0.2.17",true).getString("version").equals("0.2.19"),"Design selects highest non-draft design release only");
        require(AppUpdater.latest(mixed,"0.2.7").getString("version").equals("9.0.0"),"Production selector ignores all design tags");
        require(AppUpdater.latest(mixed,"0.2.19",true)==null,"No same-version or downgrade offer");
        require(AppUpdater.latest(new JSONArray().put(release("9.0.0",false,false)),"0.2.17",true)==null,"No production fallback");
        require(AppUpdater.latest(new JSONArray().put(release("9.0.0",true,false)),"0.2.7")==null,"No design fallback for production");
        for(String failure:new String[]{"name","url","digest","size","state"}){
            JSONObject r=release("0.2.18",true,false),a=asset(r);
            if(failure.equals("name"))a.put("name","PhotoPick-0.2.18-debug.apk");
            if(failure.equals("url"))a.put("browser_download_url","https://evil.example/app.apk");
            if(failure.equals("digest"))a.remove("digest");
            if(failure.equals("size"))a.put("size",101L*1024*1024);
            if(failure.equals("state"))a.put("state","new");
            require(AppUpdater.latest(new JSONArray().put(r),"0.2.17",true)==null,"Reject invalid design asset: "+failure);
        }
        JSONObject malformed=release("0.2.18",true,false);malformed.put("tag_name","design-v0.2.18-preview");
        require(AppUpdater.latest(new JSONArray().put(malformed),"0.2.17",true)==null,"Exact design tag format required");
        require(AppUpdater.compareVersion("0.2.18","0.2.9")>0,"Numeric comparison");
        JSONObject production=release("0.2.8",false,false);asset(production).remove("digest");
        require(AppUpdater.latest(new JSONArray().put(production),"0.2.7")!=null,"Existing production digest compatibility preserved");
        System.out.println("PASS: "+cases+" release selection and channel isolation cases");
    }
}
