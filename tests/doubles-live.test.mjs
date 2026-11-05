import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {
  generateDoublesDraw,updateDoublesResult,createDoublesPlayoffs,
  updateDoublesPlayoffResult
} from "../site/assets/doubles.js";
import {buildLiveDisplay} from "../site/assets/live-model.js";
import {renderLiveScreen} from "../site/assets/live-ui.js";
import {publicLiveSnapshot,remoteLiveUrl} from "../site/assets/remote-live.js";

function fixture({teams=8,courts=4}={}) {
  const t=newTournament({type:"doubles",name:"Jugend & Erwachsene",rounds:4,
    duration:20,breakMinutes:10,startTime:"10:00",
    courts:Array.from({length:courts},(_,i)=>i+1)});
  t.doubles.teams=Array.from({length:teams},(_,i)=>({
    id:"team-"+i,player1:"Spieler "+i+" A",player2:"Spieler "+i+" B",
    present:true,tier1:"standard",tier2:"standard",paid1:9999,paid2:15000
  }));
  t.doubles.draw=generateDoublesDraw(t,{seed:9876});
  return t;
}
function scoreAll(t) {
  for (const [ri,round] of t.doubles.draw.rounds.entries()) {
    for (const [mi] of round.matches.entries()) {
      t.doubles.draw=updateDoublesResult(t,ri,mi,{score1:6,score2:3,winner:1});
    }
  }
}

test("Doppel-Livebild verwendet feste Partner und eine Teamrangliste",()=>{
  const t=fixture();
  const view=buildLiveDisplay(t);
  assert.equal(view.mode,"round");
  assert.equal(view.format,"doubles");
  assert.match(view.subtitle,/feste Teams/);
  assert.equal(view.matches.length,4);
  assert.equal(view.matches[0].left.length,2);
  assert.equal(view.matches[0].right.length,2);
  assert.equal(view.ranking.length,8);
  assert.equal(view.ranking[0].wins,0);
  const html=renderLiveScreen(view);
  assert.match(html,/Doppel-Livetabelle/);
  assert.doesNotMatch(html,/Schleifchen-Stand/);
  assert.match(html,/Game-Differenz/);
});

test("Zuschauer-Daten sind auf Spielpaarungen und Rangliste begrenzt",()=>{
  const t=fixture();
  t.doubles.teams[0].player1='<script>alert("x")</script>';
  // Der Spielplan bleibt gültig: Name ist kein Bestandteil der Draw-Signatur,
  // beim Neuladen würden unzulässige Namen erst in die Oberfläche escaped.
  const view=publicLiveSnapshot(t);
  const raw=JSON.stringify(view);
  assert.equal(view.format,"doubles");
  assert.equal(view.id,undefined);
  for(const token of ["paid1","paid2","feePaid","entryFee","tier1","tier2",
    "participants","present","9999","15000","roundClocks","playoffOptOut"]) {
    assert.doesNotMatch(raw,new RegExp(token));
  }
  const html=renderLiveScreen(view);
  assert.doesNotMatch(html,/<script>|<img/);
  assert.match(html,/&lt;script&gt;/);
});

test("Doppel-Monitor wählt auf Wunsch eine Runde und erhält Auswahl nach JSON-Reload",()=>{
  const t=fixture({teams:9,courts:1});
  const index=20;
  t.liveDisplay={mode:"round",index};
  assert.equal(buildLiveDisplay(t).index,index);
  const restored=normalizeTournament(t);
  assert.deepEqual(restored.liveDisplay,{mode:"round",index});
  assert.equal(buildLiveDisplay(restored).index,index);
});

test("Doppelmonitor zeigt nach vollständiger Vorrunde die Top-8-Play-offs",()=>{
  const t=fixture();
  scoreAll(t);
  t.doubles.playoffs=createDoublesPlayoffs(t);
  let view=publicLiveSnapshot(t);
  assert.equal(view.mode,"finals");
  assert.equal(view.title,"Viertelfinale");
  assert.equal(view.matches.length,4);
  for(let i=0;i<4;i++)t.doubles.playoffs=updateDoublesPlayoffResult(t,"quarterfinals",i,{score1:6,score2:3,winner:1});
  view=buildLiveDisplay(t);
  assert.equal(view.title,"Halbfinale");
  for(let i=0;i<2;i++)t.doubles.playoffs=updateDoublesPlayoffResult(t,"semifinals",i,{score1:6,score2:3,winner:1});
  view=buildLiveDisplay(t);
  assert.equal(view.title,"Finale");
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"final",0,{score1:6,score2:3,winner:1});
  view=buildLiveDisplay(t);
  assert.equal(view.title,"Spiel um Platz 3");
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"thirdPlace",0,{score1:6,score2:3,winner:1});
  view=buildLiveDisplay(t);
  assert.equal(view.champion.length,2);
  assert.match(renderLiveScreen(view),/TURNIERSIEGER-DOPPEL/);
});

test("Die manuell gewählte Vorrunde bleibt gegenüber den Play-offs sichtbar",()=>{
  const t=fixture();scoreAll(t);
  t.doubles.playoffs=createDoublesPlayoffs(t);
  t.liveDisplay={mode:"round",index:1};
  const view=buildLiveDisplay(t);
  assert.equal(view.mode,"round");
  assert.equal(view.index,1);
});

test("Link vom Doppelturnier führt zur bestehenden Anzeige ohne Schreibschlüssel",()=>{
  const channel="a".repeat(48);
  const url=remoteLiveUrl(channel,"https://app.tennis-schiri.de/doppel.html");
  assert.equal(url,"https://app.tennis-schiri.de/live.html#kanal="+channel);
});

test("Die Schleifchen-Liveanzeige bleibt kompatibel",()=>{
  assert.equal(buildLiveDisplay(null).mode,"missing");
  const view=renderLiveScreen({
    mode:"round",name:"Altes Schleifchenturnier",date:"2026-11-05",startTime:"10:00",
    title:"Runde 1",subtitle:"Schleifchenturnier",progress:0,total:1,index:0,
    plannedStart:"10:00",plannedEnd:"10:20",matches:[],
    ranking:[{place:1,name:"Beispiel",ribbons:3,played:3}],
    timer:{status:"ready",display:"20:00",expired:false}
  });
  assert.match(view,/Schleifchen-Stand/);
  assert.match(view,/3 ◉/);
});
