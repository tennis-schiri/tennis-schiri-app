import {BrowserTournamentStore} from "./storage.js?v=060";
import {buildLiveDisplay} from "./live-model.js?v=060";
import {clockFor} from "./operations.js?v=060";
import {renderLiveScreen} from "./live-ui.js?v=060";

const root=document.getElementById("live-root");
const displayedAt=document.getElementById("live-current-time");
const toggle=document.getElementById("fullscreen-toggle");
const requested=new URLSearchParams(window.location.search).get("turnier");
const STORAGE_KEY="tennis-schiri-tournaments-v1";
let lastSnapshot="";
let lastMode=null;
let lastTournament=null;

const selectedTournament=()=>{
  const store=new BrowserTournamentStore();
  if(requested)return store.list().find(t=>t.id===requested)||null;
  return store.active();
};
function refresh() {
  const tournament=selectedTournament();
  const fingerprint=tournament?JSON.stringify(tournament):"missing";
  if(fingerprint===lastSnapshot)return;
  lastSnapshot=fingerprint;
  lastTournament=tournament;
  const view=buildLiveDisplay(tournament);
  lastMode=view;
  root.innerHTML=renderLiveScreen(view);
}
function updateClock() {
  const now=Date.now();
  if(displayedAt)displayedAt.textContent=new Date(now).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  if(lastMode?.mode!=="round"||!lastTournament)return;
  const el=document.querySelector("[data-live-timer]");
  if(!el)return;
  const clock=clockFor(lastTournament,lastMode.index,now);
  el.textContent=clock.display;
  const panel=el.closest(".live-time-panel");
  if(panel)panel.classList.toggle("overtime",clock.expired&&clock.status==="running");
  const status=document.querySelector("[data-live-status]");
  if(status)status.textContent={
    ready:"NOCH NICHT GESTARTET",running:clock.expired?"ÜBERZEIT":"LÄUFT",
    paused:"PAUSIERT",finished:"BEENDET"
  }[clock.status];
}
window.addEventListener("storage",e=>{
  if(e.key===STORAGE_KEY||e.key===null)refresh();
});
window.addEventListener("focus",refresh);
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden){refresh();updateClock();}
});
if(toggle)toggle.addEventListener("click",()=>{
  if(document.fullscreenElement)document.exitFullscreen?.().catch?.(()=>{});
  else document.documentElement.requestFullscreen?.().catch?.(()=>{});
});
document.addEventListener("fullscreenchange",()=>{
  if(toggle)toggle.textContent=document.fullscreenElement?"⛶ Vollbild verlassen":"⛶ Vollbild";
});
// Polling als Sicherheitsnetz, falls ein Speicherereignis beim Wechsel
// des Monitors/Fensters verpasst wurde; Countdown selbst läuft sekundengenau.
window.setInterval(()=>{refresh();updateClock();},1000);
refresh();
updateClock();
