import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";
import {generateRibbonDraw} from "../site/assets/draw.js";
import {updateRibbonMatchResult,ribbonStandings} from "../site/assets/results.js";
import {generateRibbonSpecialRound} from "../site/assets/special.js";
import {createRibbonFinals,updateRibbonFinalResult} from "../site/assets/finals.js";
import {changeRoundClock} from "../site/assets/operations.js";
import {buildLiveDisplay,selectLiveRound} from "../site/assets/live-model.js";

function fixture({strong=8,weak=8,rounds=4,courts=[1,2,3,4]}={}){
  const t={id:"demo",name:"Sommer-Schleifchen",date:"2026-11-05",startTime:"10:00",
    duration:20,breakMinutes:10,rounds,courts,roundClocks:{},liveDisplay:null,
    finalSize:8,finalOptOut:[],participants:[
      ...Array.from({length:strong},(_,i)=>({id:"s"+i,name:"Stark "+i,group:"stark",present:true,feePaidCents:500,feeOverrideCents:null})),
      ...Array.from({length:weak},(_,i)=>({id:"w"+i,name:"Schwächer "+i,group:"schwaecher",present:true,feePaidCents:500,feeOverrideCents:null}))
    ]};
  return t;
}
function ready(t=fixture()){
  t.draw=generateRibbonDraw(t,{seed:37});
  return t;
}
function complete(t){
  for(let i=0;i<t.draw.rounds.length;i++)
    for(let j=0;j<t.draw.rounds[i].matches.length;j++)
      t.draw=updateRibbonMatchResult(t,i,j,{winner:(i+j)%2+1});
  if(t.draw.special){
    t.draw=generateRibbonSpecialRound(t,{seed:12});
    for(let j=0;j<t.draw.specialRound.matches.length;j++)
      t.draw=updateRibbonMatchResult(t,t.draw.rounds.length,j,{winner:1});
  }
  return t;
}

test("Ohne Turnier bzw. ohne Auslosung erscheint eine Warteanzeige",()=>{
  assert.equal(buildLiveDisplay(null).mode,"missing");
  assert.equal(buildLiveDisplay(fixture()).mode,"waiting");
});

test("Erste unentschiedene Runde wird automatisch gezeigt",()=>{
  const t=ready();
  const live=buildLiveDisplay(t,1000000);
  assert.equal(live.mode,"round");
  assert.equal(live.index,0);
  assert.equal(live.title,"Runde 1");
  assert.equal(live.plannedStart,"10:00");
  assert.equal(live.plannedEnd,"10:20");
  assert.equal(live.matches.length,t.draw.rounds[0].matches.length);
  assert.equal(live.timer.display,"20:00");
  assert.equal(live.progress,0);
});

test("Auf einem Monitor werden keine Nenngelder oder Barzahlungen an Datenmodell ausgegeben",()=>{
  const t=ready();
  t.participants[0].feePaidCents=9999;
  t.participants[0].feeTierId="jugend";
  const visible=JSON.stringify(buildLiveDisplay(t));
  assert.doesNotMatch(visible,/feePaid|feeTier|entryFee|cash|payment|Nenngeld|9999/);
});

test("Eingetragene Ergebnisse markieren Sieger und Zwischenstand",()=>{
  const t=ready();
  t.draw=updateRibbonMatchResult(t,0,0,{winner:2,score1:2,score2:6});
  const view=buildLiveDisplay(t);
  assert.equal(view.progress,1);
  assert.equal(view.matches[0].winner,2);
  assert.equal(view.matches[0].score1,2);
  assert.equal(view.matches[0].score2,6);
  assert.ok(view.ranking.some(p=>p.ribbons>0));
});

test("Laufende Rundenuhr wird selbst ohne Neuladen richtig berechnet",()=>{
  const t=ready(),now=2000000;
  t.roundClocks=changeRoundClock(t,0,"start",now);
  const view=buildLiveDisplay(t,now+90000);
  assert.equal(view.timer.display,"18:30");
  assert.equal(view.timer.status,"running");
  assert.equal(view.index,0);
});

test("Die zuletzt gestartete laufende Runde hat Vorrang vor Ergebnisstand",()=>{
  const t=ready(),now=1000000;
  t.roundClocks=changeRoundClock(t,0,"start",now);
  t.roundClocks=changeRoundClock(t,0,"pause",now+30000);
  t.roundClocks=changeRoundClock(t,1,"start",now+45000);
  assert.equal(selectLiveRound(t),1);
  assert.equal(buildLiveDisplay(t,now+60000).title,"Runde 2");
});

test("Turnierleitung kann eine andere Runde bewusst auf den Monitor legen",()=>{
  const t=ready();
  t.roundClocks=changeRoundClock(t,0,"start",1000000);
  t.liveDisplay={mode:"round",index:2};
  assert.equal(buildLiveDisplay(t,1010000).index,2);
  assert.equal(buildLiveDisplay(t,1010000).title,"Runde 3");
  t.liveDisplay=null;
  assert.equal(buildLiveDisplay(t,1010000).index,0);
});

test("Ungültige manuelle Rundenauswahl fällt sicher auf Automatik zurück",()=>{
  const t=ready();
  t.liveDisplay={mode:"round",index:99};
  assert.equal(selectLiveRound(t),0);
});

test("Auffüllrunde zeigt Zusatzspieler, ohne ihre Nenngeld-Daten zu veröffentlichen",()=>{
  const t=complete(ready(fixture({strong:5,weak:5,rounds:3,courts:[1,2,3]})));
  assert.ok(t.draw.specialRound);
  t.liveDisplay={mode:"round",index:t.draw.rounds.length};
  const view=buildLiveDisplay(t);
  assert.equal(view.title,"Auffüllrunde");
  assert.equal(view.matches.length,t.draw.specialRound.matches.length);
  assert.ok(view.matches.some(m=>m.leftFillers.some(Boolean)||m.rightFillers.some(Boolean)));
});

test("Endrunde wird nach Vorrunden-Abschluss automatisch im Live-Modus sichtbar",()=>{
  const t=complete(ready());
  t.draw=createRibbonFinals(t,{seed:11});
  const view=buildLiveDisplay(t);
  assert.equal(view.mode,"finals");
  assert.equal(view.title,"Halbfinale");
  assert.equal(view.matches.length,2);
  assert.equal(view.matches[0].left.length,2);
});

test("Endrunden-Ergebnisse zeigen das Finale und zuletzt das Sieger-Doppel",()=>{
  const t=complete(ready());
  t.draw=createRibbonFinals(t,{seed:11});
  t.draw=updateRibbonFinalResult(t,0,0,{winner:1});
  t.draw=updateRibbonFinalResult(t,0,1,{winner:2});
  assert.equal(buildLiveDisplay(t).title,"Finale");
  t.draw=updateRibbonFinalResult(t,1,0,{winner:2,score1:3,score2:6});
  const live=buildLiveDisplay(t);
  assert.equal(live.mode,"finals");
  assert.equal(live.champion.length,2);
  assert.equal(live.matches[0].winner,2);
});

test("Bei einer aktiven Endrunde kann die Leitung weiterhin die Vorrunde vorführen",()=>{
  const t=complete(ready());
  t.draw=createRibbonFinals(t,{seed:11});
  t.liveDisplay={mode:"round",index:0};
  assert.equal(buildLiveDisplay(t).mode,"round");
  t.liveDisplay={mode:"finals"};
  assert.equal(buildLiveDisplay(t).mode,"finals");
});

test("Veraltete Auslosung wird nicht als gültige Live-Paarung angezeigt",()=>{
  const t=ready();
  t.participants[0].present=false;
  const live=buildLiveDisplay(t);
  assert.equal(live.mode,"invalid");
  assert.equal(live.matches,undefined);
});

test("Manuelle Auswahl und bestehende Uhren überstehen JSON-Backup",()=>{
  const memory=new Map();
  globalThis.localStorage={
    getItem(k){return memory.get(k)??null;},
    setItem(k,v){memory.set(k,v);}
  };
  const db=new BrowserTournamentStore();
  const t=db.create({name:"Live-Test",rounds:4,courts:[1,2,3,4]});
  for(let i=0;i<8;i++){
    db.upsertParticipant(t.id,{name:"S"+i,group:"stark",present:true});
    db.upsertParticipant(t.id,{name:"W"+i,group:"schwaecher",present:true});
  }
  const current=db.active();
  db.editTournament(t.id,{draw:generateRibbonDraw(current,{seed:9})});
  const running=changeRoundClock(db.active(),0,"start",1000000);
  db.editTournament(t.id,{liveDisplay:{mode:"round",index:1},roundClocks:running});
  const saved=new BrowserTournamentStore().exportJson();
  db.importJson(saved);
  assert.deepEqual(new BrowserTournamentStore().active().liveDisplay,{mode:"round",index:1});
  assert.equal(new BrowserTournamentStore().active().roundClocks["0"].firstStartedAt,1000000);
});
