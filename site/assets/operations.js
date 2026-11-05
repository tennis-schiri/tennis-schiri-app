// TENNILO – Turnierorganisation (v0.5.0): Nenngeld ausschließlich BAR,
// geplante Spielzeiten und eine browserseitig persistierte Rundenuhr.
// Keine Überweisung, kein Payment-Provider, keine Server-Uhr.
export function euroCents(value) {
  const raw=String(value??"").trim().replace(",",".");
  if(!/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(raw))
    throw Error("Bitte einen Betrag in Euro eingeben (z. B. 5,00), maximal 99.999,99 €.");
  const [whole,dec=""]=raw.split(".");
  return Number(whole)*100+Number(dec.padEnd(2,"0"));
}
export function euroText(cents) {
  if(!Number.isSafeInteger(cents)||cents<0)throw Error("Ungültiger Eurobetrag.");
  return (cents/100).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
}
export const euroInput=cents=>(cents/100).toFixed(2).replace(".",",");
export const entryDue=(t,p)=>p?.feeOverrideCents==null ? (t?.entryFeeCents||0) : p.feeOverrideCents;
export function feesOverview(t) {
  const players=(t?.participants||[]).map(p=>{
    const due=entryDue(t,p),paid=p.feePaidCents||0;
    return {id:p.id,name:p.name,present:p.present,due,paid,open:Math.max(0,due-paid),
      extra:Math.max(0,paid-due),status:due===0&&paid===0?"frei":paid===0?"offen":
      paid<due?"teilweise":paid===due?"bezahlt":"überzahlung"};
  });
  return {players,expected:players.reduce((a,p)=>a+p.due,0),
    received:players.reduce((a,p)=>a+p.paid,0),
    open:players.reduce((a,p)=>a+p.open,0),
    extra:players.reduce((a,p)=>a+p.extra,0),
    paidCount:players.filter(p=>p.status==="bezahlt").length,
    openCount:players.filter(p=>p.open>0).length};
}
const pad=n=>String(n).padStart(2,"0");
function timeText(minutes) {
  const day=Math.floor(minutes/1440),n=((minutes%1440)+1440)%1440;
  return `${pad(Math.floor(n/60))}:${pad(n%60)}${day>0?" (+1 Tag)":""}`;
}
export function plannedRound(t,index) {
  if(!Number.isInteger(index)||index<0||index>=21)throw Error("Ungültige Rundennummer.");
  const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t.startTime||""));
  if(!match)throw Error("Bitte eine gültige Startzeit einstellen.");
  const start=Number(match[1])*60+Number(match[2])+index*(t.duration+t.breakMinutes);
  return {
    start:timeText(start),end:timeText(start+t.duration),
    pauseEnd:timeText(start+t.duration+t.breakMinutes),
    duration:t.duration,breakMinutes:t.breakMinutes
  };
}
export function clockFor(t,index,now=Date.now()) {
  const c=t?.roundClocks?.[String(index)]||null;
  const durationMs=c?.durationMs??t.duration*60000;
  const elapsedMs=c?Math.max(0,c.elapsedMs+(c.startedAt==null?0:Math.max(0,now-c.startedAt))):0;
  const remainingMs=Math.max(0,durationMs-elapsedMs);
  const overtimeMs=Math.max(0,elapsedMs-durationMs);
  const seconds=Math.ceil(remainingMs/1000);
  const overtimeSeconds=Math.floor(overtimeMs/1000);
  const two=x=>pad(x);
  const display=seconds>0?`${two(Math.floor(seconds/60))}:${two(seconds%60)}`:
    overtimeSeconds>0?`+${two(Math.floor(overtimeSeconds/60))}:${two(overtimeSeconds%60)}`:"00:00";
  return {status:!c?"ready":c.finishedAt!=null?"finished":c.startedAt!=null?"running":"paused",
    display,elapsedMs,remainingMs,overtimeMs,expired:elapsedMs>=durationMs,
    startedAt:c?.firstStartedAt??null,
    finishedAt:c?.finishedAt??null,durationMs};
}
export function changeRoundClock(t,index,action,now=Date.now()) {
  const total=(t.draw?.rounds?.length||0)+(t.draw?.specialRound?1:0);
  if(!t.draw||!Number.isInteger(index)||index<0||index>=total)
    throw Error("Diese Runde ist noch nicht ausgelost.");
  if(!["start","pause","resume","finish","reset"].includes(action))throw Error("Unbekannte Uhr-Aktion.");
  if(!Number.isSafeInteger(now)||now<=0)throw Error("Ungültige Uhrzeit.");
  const clocks={...(t.roundClocks||{})},id=String(index);
  const previous=clocks[id]||null;
  const live=previous?.startedAt!=null&&!previous?.finishedAt;
  if(action==="reset"){delete clocks[id];return clocks;}
  if(action==="start"){
    if(previous)throw Error("Diese Runde wurde bereits gestartet. Bitte fortsetzen oder zurücksetzen.");
    const competing=Object.entries(clocks).find(([key,x])=>key!==id&&x?.startedAt!=null&&!x?.finishedAt);
    if(competing)throw Error(`Runde ${Number(competing[0])+1} läuft noch. Bitte diese Uhr zuerst pausieren oder beenden.`);
    clocks[id]={firstStartedAt:now,startedAt:now,elapsedMs:0,durationMs:t.duration*60000,finishedAt:null};
  }else if(action==="pause"){
    if(!live)throw Error("Diese Rundenuhr läuft nicht.");
    clocks[id]={...previous,elapsedMs:previous.elapsedMs+Math.max(0,now-previous.startedAt),startedAt:null};
  }else if(action==="resume"){
    if(!previous||previous.finishedAt!=null||previous.startedAt!=null)throw Error("Runde kann nicht fortgesetzt werden.");
    const competing=Object.entries(clocks).find(([key,x])=>key!==id&&x?.startedAt!=null&&!x?.finishedAt);
    if(competing)throw Error("Es läuft bereits eine andere Rundenuhr.");
    clocks[id]={...previous,startedAt:now};
  }else if(action==="finish"){
    if(!previous||previous.finishedAt!=null)throw Error("Diese Runde wurde noch nicht gestartet oder bereits beendet.");
    clocks[id]={...previous,elapsedMs:previous.elapsedMs+(live?Math.max(0,now-previous.startedAt):0),
      startedAt:null,finishedAt:now};
  }
  return clocks;
}
