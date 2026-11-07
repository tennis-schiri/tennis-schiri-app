import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {
  generateDoublesDraw,updateDoublesResult,createDoublesPlayoffs,
  updateDoublesPlayoffResult,updateDoublesPlayoffCourt,doublesPlayoffStages,
  doublesStandings,decideDoublesTie,doublesPlayoffStatus
} from "../site/assets/doubles.js";
import {buildLiveDisplay} from "../site/assets/live-model.js";
import {renderLiveScreen} from "../site/assets/live-ui.js";
import {publicLiveSnapshot} from "../site/assets/remote-live.js";
import {readFileSync} from "node:fs";

function fixture(size) {
  const t=newTournament({type:"doubles",name:"Endrunde & Plätze",playoffSize:size,
    rounds:size===2?1:size===4?2:4,courts:[1,2,3,4,5,6,7,8],
    courtLabels:{"1":"Center Court","7":"Nebenplatz 7","8":"Final-Court"},
    startTime:"10:00",duration:20,breakMinutes:5});
  t.doubles.teams=Array.from({length:size},(_,i)=>({
    id:"team-"+i,player1:"Spieler "+i+" A",player2:"Spieler "+i+" B",
    present:true,tier1:"standard",tier2:"standard",paid1:0,paid2:0
  }));
  t.doubles.draw=generateDoublesDraw(t,{seed:182});
  for(let r=0;r<t.doubles.draw.rounds.length;r++)
    for(let m=0;m<t.doubles.draw.rounds[r].matches.length;m++)
      t.doubles.draw=updateDoublesResult(t,r,m,{score1:6,score2:3,winner:1});
  for(const tie of doublesStandings(t).tieGroups.filter(x=>!x.resolved))
    t.doubles.tieBreaks=decideDoublesTie(t,tie.ids,tie.order,"manual");
  t.doubles.playoffs=createDoublesPlayoffs(t);
  return t;
}
function stageMatches(t,id) {
  return id==="final"||id==="thirdPlace"?[t.doubles.playoffs[id]]:t.doubles.playoffs[id];
}
const result={score1:6,score2:3,winner:1};
for(const size of [2,4,8,16]){
  test("Plätze der Top-"+size+"-Endrunde bleiben bei Ergebnisfortschreibung und Backup erhalten",()=>{
    let t=fixture(size);
    const stages=doublesPlayoffStages(t);
    const first=stages[0].id;
    assert.equal(stageMatches(t,first)[0].court,1);
    t.doubles.playoffs=updateDoublesPlayoffCourt(t,first,0,7);
    assert.equal(stageMatches(t,first)[0].court,7);
    t.doubles.playoffs=updateDoublesPlayoffCourt(t,"final",0,8);
    assert.equal(t.doubles.playoffs.final.court,8);
    if(size>=4){
      t.doubles.playoffs=updateDoublesPlayoffCourt(t,"thirdPlace",0,7);
      assert.equal(t.doubles.playoffs.thirdPlace.court,7);
    }
    assert.throws(()=>updateDoublesPlayoffCourt(t,"unknown",0,1),/Ungültige/);
    assert.throws(()=>updateDoublesPlayoffCourt(t,first,20,1),/Ungültige/);
    assert.throws(()=>updateDoublesPlayoffCourt(t,first,0,999),/vorhandenen/);
    const saved=normalizeTournament(JSON.parse(JSON.stringify(t)));
    assert.equal(stageMatches(saved,first)[0].court,7);
    assert.equal(saved.doubles.playoffs.final.court,8);
    t=saved;
    for(const stage of stages){
      for(let i=0;i<stage.count;i++){
        const current=stageMatches(t,stage.id)[i];
        assert.ok(current.team1&&current.team2,"Fehlende Teilnehmer in "+stage.id);
        t.doubles.playoffs=updateDoublesPlayoffResult(t,stage.id,i,result);
      }
    }
    assert.equal(stageMatches(t,first)[0].court,size===2?8:7);
    assert.equal(t.doubles.playoffs.final.court,8);
    if(size>=4)assert.equal(t.doubles.playoffs.thirdPlace.court,7);
    assert.equal(doublesPlayoffStatus(t).done,true);
    t.liveDisplay={mode:"finals",stage:"final"};
    const screen=buildLiveDisplay(t);
    assert.equal(screen.title,"Finale");
    assert.equal(screen.matches[0].court,"Final-Court");
    assert.equal(publicLiveSnapshot(t).matches[0].court,"Final-Court");
  });
}

test("Platzvergabe bleibt sogar bei geänderter Vorrunden-Endrundenpaarung erhalten",()=>{
  const t=fixture(8);
  t.doubles.playoffs=updateDoublesPlayoffCourt(t,"semifinals",0,7);
  t.doubles.playoffs=updateDoublesPlayoffCourt(t,"final",0,8);
  for(let i=0;i<4;i++)t.doubles.playoffs=updateDoublesPlayoffResult(t,"quarterfinals",i,result);
  assert.equal(t.doubles.playoffs.semifinals[0].court,7);
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"semifinals",0,result);
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"semifinals",1,result);
  assert.equal(t.doubles.playoffs.final.court,8);
  // Flip a quarterfinal result, which resets dependent matches but not their courts.
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"quarterfinals",0,
    {score1:3,score2:6,winner:2});
  assert.equal(t.doubles.playoffs.semifinals[0].court,7);
  assert.equal(t.doubles.playoffs.semifinals[0].result,null);
  assert.equal(t.doubles.playoffs.final.court,8);
});

test("Auswahl Viertelfinale/Halbfinale/Finale steuert die Live-Ansicht und bleibt gespeichert",()=>{
  const t=fixture(8);
  for(const [id,title] of [
    ["quarterfinals","Viertelfinale"],["semifinals","Halbfinale"],["final","Finale"],
    ["thirdPlace","Spiel um Platz 3"]
  ]){
    t.liveDisplay={mode:"finals",stage:id};
    const saved=normalizeTournament(t);
    assert.deepEqual(saved.liveDisplay,{mode:"finals",stage:id});
    const live=buildLiveDisplay(saved);
    assert.equal(live.mode,"finals");
    assert.equal(live.title,title);
    assert.equal(publicLiveSnapshot(saved).title,title);
    const html=renderLiveScreen(live);
    assert.match(html,new RegExp(title,"i"));
    assert.match(html,/live-playoff-phase/);
    assert.match(html,new RegExp(title.toLocaleUpperCase("de-DE"),"u"));
  }
  t.liveDisplay={mode:"finals",stage:"not-a-stage"};
  assert.deepEqual(normalizeTournament(t).liveDisplay,{mode:"finals"});
  assert.equal(buildLiveDisplay(normalizeTournament(t)).title,"Viertelfinale");
});

test("Die Doppel-Adminoberfläche bietet Platzwahl je Partie und Live-Phase je Runde",()=>{
  const ui=readFileSync(new URL("../site/assets/doppel-ui.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("../site/assets/doppel.css",import.meta.url),"utf8");
  for(const marker of ['data-act="playoff-court"','data-act="live-stage"','data-stage=',
      'updateDoublesPlayoffCourt','double-po-stage-head','double-po-court-control']){
    assert.ok(ui.includes(marker),marker);
  }
  assert.ok(css.includes("double-po-court-control"));
  assert.ok(css.includes("double-po-stage-head"));
});
