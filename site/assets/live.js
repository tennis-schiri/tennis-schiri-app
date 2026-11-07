import {BrowserTournamentStore} from "./storage.js?v=091";
import {buildLiveDisplay} from "./live-model.js?v=092";
import {clockFor} from "./operations.js?v=091";
import {renderLiveScreen} from "./live-ui.js?v=092";
import {fetchLive,remoteClockAt,liveKeyValid} from "./remote-live.js?v=092";

const root=document.getElementById("live-root");
const displayedAt=document.getElementById("live-current-time");
const toggle=document.getElementById("fullscreen-toggle");
const connection=document.getElementById("live-connection");
const footerHelp=document.getElementById("live-footer-help");
const query=new URLSearchParams(window.location.search||"");
const requested=query.get("turnier");
const remoteChannel=new URLSearchParams((window.location.hash||"").replace(/^#/,"")).get("kanal");
const remoteMode=liveKeyValid(remoteChannel);
const STORAGE_KEY="tennis-schiri-tournaments-v1";
let lastSnapshot="",lastMode=null,lastTournament=null;
let lastRemoteData=null,remoteReceivedAt=0,remoteServerLag=0,lastRemoteRequest=0;
let remoteFetching=false,remoteUnreachable=false;

if(remoteMode){
  if(connection)connection.textContent="● LIVE VOM SERVER";
  if(footerHelp)footerHelp.textContent="Fernanzeige · unabhängig vom Gerät · Spielstände werden regelmäßig aktualisiert";
}else if(remoteChannel){
  root.innerHTML=renderLiveScreen({mode:"waiting",message:"Dieser Live-Link ist ungültig. Bitte den aktuellen Zuschauer-Link verwenden."});
}
function selectedTournament(){
  const store=new BrowserTournamentStore();
  if(requested)return store.list().find(t=>t.id===requested)||null;
  return store.active();
}
function refreshLocal() {
  if(remoteChannel)return;
  const t=selectedTournament(),fingerprint=t?JSON.stringify(t):"missing";
  if(fingerprint===lastSnapshot)return;
  lastSnapshot=fingerprint;
  lastTournament=t;
  lastMode=buildLiveDisplay(t);
  root.innerHTML=renderLiveScreen(lastMode);
}
function markConnection(ok){
  if(!remoteMode||!connection)return;
  connection.textContent=ok?"● LIVE VOM SERVER":"● VERBINDUNG UNTERBROCHEN";
  connection.classList.toggle("live-offline",!ok);
}
async function refreshRemote(){
  if(!remoteMode||remoteFetching)return;
  remoteFetching=true;
  lastRemoteRequest=Date.now();
  try{
    const response=await fetchLive(remoteChannel);
    const display=response.display;
    if(!display||typeof display!=="object")throw Error("Ungültige Live-Antwort.");
    const fingerprint=JSON.stringify(display);
    if(lastSnapshot!==fingerprint){
      root.innerHTML=renderLiveScreen(display);
      lastSnapshot=fingerprint;
    }
    lastMode=display;
    lastRemoteData=response;
    remoteReceivedAt=Date.now();
    remoteServerLag=Math.max(0,response.serverNow-response.savedAt);
    remoteUnreachable=false;
    markConnection(remoteServerLag<20000);
  }catch(e){
    remoteUnreachable=true;
    markConnection(false);
    if(e?.status===404||e?.status===410){
      lastRemoteData=null;lastMode=null;lastSnapshot="";
      root.innerHTML=renderLiveScreen({mode:"waiting",
        message:"Die Live-Übertragung wurde beendet oder der Link ist abgelaufen. Bitte neuen Link anfordern."});
    }else if(!lastRemoteData){
      root.innerHTML=renderLiveScreen({mode:"waiting",
        message:e?.message||"Noch keine Fernübertragung verfügbar."});
    }
  }finally{remoteFetching=false;}
}
function updateClock(){
  const now=Date.now();
  if(displayedAt)displayedAt.textContent=new Date(now).toLocaleTimeString("de-DE",{
    hour:"2-digit",minute:"2-digit",second:"2-digit"
  });
  if(lastMode?.mode!=="round")return;
  const el=document.querySelector("[data-live-timer]");
  if(!el)return;
  let status,display,expired;
  if(remoteMode){
    const stale=remoteUnreachable||remoteServerLag+(now-remoteReceivedAt)>=20000;
    markConnection(!stale);
    const elapsed=Math.min(20000,remoteServerLag+Math.max(0,now-remoteReceivedAt));
    ({status,display,expired}=remoteClockAt(lastMode.timer,elapsed));
  }else{
    if(!lastTournament)return;
    ({status,display,expired}=clockFor(lastTournament,lastMode.index,now));
  }
  el.textContent=display;
  const panel=el.closest(".live-time-panel");
  if(panel)panel.classList.toggle("overtime",expired&&status==="running");
  const text=document.querySelector("[data-live-status]");
  if(text)text.textContent={
    ready:"NOCH NICHT GESTARTET",running:expired?"ÜBERZEIT":"LÄUFT",
    paused:"PAUSIERT",finished:"BEENDET"
  }[status]||"";
}
window.addEventListener("storage",e=>{
  if(!remoteChannel&&(e.key===STORAGE_KEY||e.key===null))refreshLocal();
});
window.addEventListener("focus",()=>{
  if(remoteMode){lastRemoteRequest=0;refreshRemote();}
  else refreshLocal();
});
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden){
    if(remoteMode){lastRemoteRequest=0;refreshRemote();}
    else refreshLocal();
    updateClock();
  }
});
if(toggle)toggle.addEventListener("click",()=>{
  if(document.fullscreenElement)document.exitFullscreen?.().catch?.(()=>{});
  else document.documentElement.requestFullscreen?.().catch?.(()=>{});
});
document.addEventListener("fullscreenchange",()=>{
  if(toggle)toggle.textContent=document.fullscreenElement?"⛶ Vollbild verlassen":"⛶ Vollbild";
});
window.setInterval(()=>{
  if(remoteMode){
    if(Date.now()-lastRemoteRequest>=3000)refreshRemote();
  }else refreshLocal();
  updateClock();
},1000);
if(remoteMode)refreshRemote();
else if(!remoteChannel)refreshLocal();
updateClock();
