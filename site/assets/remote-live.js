// TENNILO v0.6.1 – explizit aktivierte Live-Übertragung zwischen Geräten.
// Zugangsschlüssel separat vom Turnier/JSON-Backup im Browser speichern.
import {buildLiveDisplay} from "./live-model.js?v=061";

const SHARE_PREFIX="tennilo-live-share-v1:";
const CHANNEL=/^[a-f0-9]{48}$/;
const API="./live-feed.php";
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
export function liveKeyValid(x){return typeof x==="string"&&CHANNEL.test(x)}
export function createLiveSecrets(random){
  if(!random||typeof random.getRandomValues!=="function")
    throw Error("Live-Übertragung benötigt HTTPS und einen sicheren Browser.");
  const get=()=>hex(random.getRandomValues(new Uint8Array(24)));
  return {channel:get(),writer:get()};
}
export function readLiveSecrets(id,storage=globalThis.localStorage){
  if(!id||!storage)return null;
  try{
    const saved=JSON.parse(storage.getItem(SHARE_PREFIX+id)||"null");
    return liveKeyValid(saved?.channel)&&liveKeyValid(saved?.writer)?
      {channel:saved.channel,writer:saved.writer}:null;
  }catch{return null;}
}
export function saveLiveSecrets(id,secrets,storage=globalThis.localStorage){
  if(!id||!liveKeyValid(secrets?.channel)||!liveKeyValid(secrets?.writer))
    throw Error("Ungültige Live-Zugangsdaten.");
  storage.setItem(SHARE_PREFIX+id,JSON.stringify(secrets));
}
export function clearLiveSecrets(id,storage=globalThis.localStorage){
  storage?.removeItem(SHARE_PREFIX+id);
}
export function remoteLiveUrl(channel,url=globalThis.location?.href){
  if(!liveKeyValid(channel))throw Error("Ungültiger Live-Link.");
  const target=new URL("./live.html",url);
  target.search="";
  target.hash="kanal="+channel;
  return target.href;
}
export function publicLiveSnapshot(t,now=Date.now()){
  // Das Live-Modell enthält ausschließlich sichtbare Paarungen, Sieger und
  // Ranglisten, niemals Anwesenheitslisten, Zahlungen oder Gesamt-Turnierdaten.
  const view=buildLiveDisplay(t,now);
  const allow=["mode","name","date","startTime","message","title","subtitle",
    "progress","total","index","plannedStart","plannedEnd","matches",
    "ranking","champion","timer"];
  return Object.fromEntries(allow.filter(key=>view[key]!==undefined)
    .map(key=>[key,view[key]]));
}
export async function publishLive(secrets,display,{action="publish",request=globalThis.fetch}={}){
  if(!liveKeyValid(secrets?.channel)||!liveKeyValid(secrets?.writer))
    throw Error("Ungültige Live-Zugangsdaten.");
  if(!["publish","stop"].includes(action))throw Error("Unbekannte Live-Aktion.");
  const response=await request(API,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    cache:"no-store",credentials:"same-origin",
    body:JSON.stringify({action,channel:secrets.channel,writer:secrets.writer,
      ...(action==="publish"?{display}:{})})
  });
  const json=await response.json().catch(()=>null);
  if(!response.ok||json?.ok!==true)
    throw Error(json?.error||"Der Live-Server ist nicht erreichbar. Bitte PHP und den Passwortschutz prüfen.");
  return json;
}
export async function fetchLive(channel,{request=globalThis.fetch}={}){
  if(!liveKeyValid(channel))throw Error("Der Fernanzeige-Link ist ungültig.");
  const response=await request(API,{
    method:"GET",cache:"no-store",credentials:"same-origin",
    headers:{"X-Tennilo-Channel":channel}
  });
  const json=await response.json().catch(()=>null);
  if(!response.ok||json?.ok!==true)
    throw Error(json?.error||"Noch keine Live-Daten verfügbar.");
  return json;
}
const pad=n=>String(n).padStart(2,"0");
export function remoteClockAt(timer,elapsedMs=0){
  if(!timer)return {display:"–",expired:false,status:"ready"};
  const status=["ready","running","paused","finished"].includes(timer.status)?timer.status:"ready";
  const elapsed=status==="running"?Math.max(0,Math.floor(elapsedMs)):0;
  const left=Math.max(0,(timer.remainingMs||0)-elapsed);
  const overtime=Math.max(0,(timer.overtimeMs||0)+Math.max(0,elapsed-(timer.remainingMs||0)));
  const expired=left===0;
  const seconds=Math.ceil(left/1000);
  const extraSeconds=Math.floor(overtime/1000);
  const display=seconds>0?`${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`:
    extraSeconds>0?`+${pad(Math.floor(extraSeconds/60))}:${pad(extraSeconds%60)}`:"00:00";
  return {status,display,expired};
}
