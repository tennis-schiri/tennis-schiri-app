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
export const feeTiers=t=>
  Array.isArray(t?.feeCategories)&&t.feeCategories.length ?
    t.feeCategories : [{id:"standard",name:"Standard",amountCents:t?.entryFeeCents||0}];
export const playerTier=(t,p)=>feeTiers(t).find(x=>x.id===p?.feeTierId)||feeTiers(t)[0];
export const entryDue=(t,p)=>p?.feeOverrideCents!=null ? p.feeOverrideCents : playerTier(t,p).amountCents;
export function feesOverview(t) {
  const players=(t?.participants||[]).map(p=>{
    const due=entryDue(t,p),paid=p.feePaidCents||0;
    return {id:p.id,name:p.name,present:p.present,tierId:playerTier(t,p).id,tierName:playerTier(t,p).name,custom:p.feeOverrideCents!=null,due,paid,open:Math.max(0,due-paid),
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
// One shared schedule for Schleifchen, fixed doubles and future formats.
// An end time is an optional target; fixed durations remain unchanged until
// organisers explicitly opt into 'fit' mode. No silent shortening of matches.
const minuteOf=value=>{
  const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value??""));
  if(!m)throw Error("Bitte eine gültige Uhrzeit im Format HH:MM eingeben.");
  return Number(m[1])*60+Number(m[2]);
};
export function timeWindow(t) {
  const start=minuteOf(t.startTime),end=t.endTime==null||t.endTime===""?null:minuteOf(t.endTime);
  if(end===null)return {start,minutes:null,end:null,overnight:false};
  if(end===start)throw Error("Start- und Endzeit dürfen nicht identisch sein.");
  return {start,minutes:(end-start+1440)%1440,end,
    overnight:end<start};
}
export function scheduleBlockCount(t) {
  if(t?.type==="doubles"){
    const preliminary=t.doubles?.draw?.rounds?.length||0;
    if(!preliminary)return null;
    const present=(t.doubles.teams||[]).filter(x=>x.present).length;
    const courts=Math.max(1,t.courts?.length||1);
    const playoffs=t.reservePlayoffs!==false&&present>=8?
      Math.ceil(4/courts)+Math.ceil(2/courts)+Math.ceil(2/courts):0;
    return preliminary+playoffs;
  }
  if(t?.type==="opc")return null; // One-point matches use their own time slots.
  const preliminary=t?.draw?.rounds?.length||0;
  if(!preliminary)return null;
  const special=t.draw?.specialRound?1:0;
  const finals=t.reserveFinals===true?(
    t.draw?.finals?.rounds?.length|| (t.finalSize===16?3:2)):0;
  return preliminary+special+finals;
}
export function tournamentSchedule(t,blocks=scheduleBlockCount(t),{minDuration=10,maxDuration=120}={}) {
  const window=timeWindow(t);
  if(!Number.isInteger(blocks)||blocks<1||blocks>500)throw Error("Bitte zuerst einen gültigen Spielplan erstellen.");
  const pause=Number(t.breakMinutes),duration=Number(t.duration);
  if(!Number.isInteger(pause)||pause<0||pause>60||
     !Number.isInteger(duration)||duration<minDuration||duration>maxDuration)
     throw Error("Ungültige Spiel- oder Wechselzeit.");
  const fit=t.timeMode==="fit";
  if(fit&&!t.endTime)throw Error("Für die automatische Endzeitanpassung bitte eine Endzeit eingeben.");
  const gapCount=blocks-1;
  const spare=window.minutes===null?null:window.minutes-gapCount*pause;
  if(fit&&spare<blocks*minDuration)
    throw Error("Die Endzeit ist zu knapp für "+blocks+" Spielblöcke mit mindestens "+
      minDuration+" Minuten Spielzeit und "+pause+" Minuten Wechselpause. Bitte weniger Spiele, mehr Plätze, kürzere Pausen oder eine spätere Endzeit wählen.");
  const base=fit?Math.min(maxDuration,Math.floor(spare/blocks)):duration;
  const extra=fit&&base<maxDuration?Math.min(blocks,Math.max(0,spare-base*blocks)):0;
  const durations=Array.from({length:blocks},(_,i)=>base+(i<extra?1:0));
  const rounds=[];
  let cursor=window.start;
  for(let i=0;i<blocks;i++){
    const d=durations[i],start=cursor;
    cursor+=d;
    rounds.push({index:i,start:timeText(start),end:timeText(cursor),
      pauseEnd:timeText(cursor+(i<gapCount||!fit?pause:0)),
      startMinutes:start,endMinutes:cursor,duration:d,
      breakMinutes:i<gapCount?pause:0});
    if(i<gapCount)cursor+=pause;
  }
  const last=rounds.at(-1);
  return {blocks,rounds,start:rounds[0].start,end:last.end,
    targetEnd:t.endTime||null,mode:fit?"fit":"fixed",
    plannedMinutes:last.endMinutes-window.start,
    windowMinutes:window.minutes,overnight:window.overnight,
    overTarget:window.minutes!==null&&last.endMinutes-window.start>window.minutes,
    usesFullWindow:window.minutes!==null&&last.endMinutes-window.start===window.minutes};
}
export function plannedRound(t,index) {
  if(!Number.isInteger(index)||index<0||index>=500)throw Error("Ungültige Rundennummer.");
  const blocks=Math.max(index+1,scheduleBlockCount(t)||index+1);
  // Without a draw there is no reliable global match count. Fixed mode still
  // supports its historical index-based calculation. Fit waits for a draw.
  if(t.timeMode==="fit"&&!scheduleBlockCount(t))
    throw Error("Spielzeiten lassen sich nach der Auslosung an die Endzeit anpassen.");
  const plan=tournamentSchedule(t,blocks);
  const r=plan.rounds[index];
  return {start:r.start,end:r.end,pauseEnd:r.pauseEnd,duration:r.duration,
    breakMinutes:t.timeMode==="fit"?r.breakMinutes:t.breakMinutes};
}
export function clockFor(t,index,now=Date.now()) {
  const c=t?.roundClocks?.[String(index)]||null;
  const durationMs=c?.durationMs??(t?.timeMode==="fit"&&scheduleBlockCount(t)?plannedRound(t,index).duration:t.duration)*60000;
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
    clocks[id]={firstStartedAt:now,startedAt:now,elapsedMs:0,durationMs:plannedRound(t,index).duration*60000,finishedAt:null};
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
