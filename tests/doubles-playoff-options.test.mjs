import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {
  generateDoublesDraw,updateDoublesResult,doublesStandings,doublesPlayoffPreview,
  createDoublesPlayoffs,updateDoublesPlayoffResult,doublesPlayoffStatus,
  doublesPlayoffStages,doublesPlayoffSize,decideDoublesTie
} from "../site/assets/doubles.js";
import {tournamentSchedule} from "../site/assets/operations.js";
import {buildLiveDisplay} from "../site/assets/live-model.js";
import {renderLiveScreen} from "../site/assets/live-ui.js";
import {publicLiveSnapshot} from "../site/assets/remote-live.js";
import {makeDemoCopy,fillDemoResults} from "../site/assets/demo-data.js";

function fixture(count,size) {
  const t=newTournament({type:"doubles",name:"Play-off-Test",playoffSize:size,
    rounds:count===2?1:count===4?2:4,courts:Array.from({length:8},(_,i)=>i+1),
    startTime:"10:00",duration:20,breakMinutes:5});
  t.doubles.teams=Array.from({length:count},(_,i)=>({
    id:"team-"+i,player1:"Vorname "+i+" A",player2:"Vorname "+i+" B",
    present:true,tier1:"standard",tier2:"standard",paid1:0,paid2:0
  }));
  t.doubles.draw=generateDoublesDraw(t,{seed:2486});
  return t;
}
function finishPrelim(t) {
  for(let ri=0;ri<t.doubles.draw.rounds.length;ri++)
    for(let mi=0;mi<t.doubles.draw.rounds[ri].matches.length;mi++)
      t.doubles.draw=updateDoublesResult(t,ri,mi,{score1:6,score2:3,winner:1});
}
function settleOpenTies(t) {
  // Der Test prüft Endrunden. Bei künstlich gleichen Vorrundenergebnissen
  // muss die Turnierleitung vor dem endgültigen Setzen bewusst entscheiden.
  for(const group of doublesStandings(t).tieGroups.filter(x=>!x.resolved))
    t.doubles.tieBreaks=decideDoublesTie(t,group.ids,group.order,"manual");
}
function matchRows(p,stage) {
  return stage==="final"||stage==="thirdPlace"?[p[stage]]:p[stage];
}
for(const size of [2,4,8,16]){
  test("Doppel: Top "+size+" vom Vorrundenabschluss bis zum Sieger",()=>{
    const t=fixture(size,size);
    assert.equal(doublesPlayoffSize(t),size);
    assert.equal(doublesPlayoffPreview(t).ready,false);
    finishPrelim(t);
    assert.equal(doublesStandings(t).finished,true);
    settleOpenTies(t);
    const preview=doublesPlayoffPreview(t);
    assert.equal(preview.ready,true);
    assert.equal(preview.size,size);
    const schedule=tournamentSchedule(t);
    const expected=size===2?1:size===4?2:size===8?3:4;
    assert.equal(schedule.blocks,t.doubles.draw.rounds.length+expected);
    t.doubles.playoffs=createDoublesPlayoffs(t);
    assert.equal(t.doubles.playoffs.seeds.length,size);
    assert.equal(doublesPlayoffStatus(t).ready,true);
    assert.equal(normalizeTournament(t).doubles.playoffs.seeds.length,size);
    const stages=doublesPlayoffStages(t);
    assert.equal(stages[0].count,size/2);
    let scored=0;
    for(const {id,count} of stages){
      const matches=matchRows(t.doubles.playoffs,id);
      assert.equal(matches.length,count);
      for(let i=0;i<count;i++){
        assert.ok(matches[i].team1 && matches[i].team2,
          id+" pairing should be ready when previous stage is finished");
        t.doubles.playoffs=updateDoublesPlayoffResult(t,id,i,{score1:6,score2:3,winner:1});
        scored++;
      }
    }
    assert.equal(scored,size===2?1:size);
    const finished=doublesPlayoffStatus(t);
    assert.equal(finished.done,true);
    assert.ok(finished.champion);
    assert.equal(Boolean(finished.third),size>2);
    const first=stages[0].id;
    assert.throws(()=>updateDoublesPlayoffResult(t,"invalid",0,{score1:6,score2:3,winner:1}),
      /Ungültige Play-off/);
    if(size>2){
      t.doubles.playoffs=updateDoublesPlayoffResult(t,first,0,{score1:3,score2:6,winner:2});
      assert.equal(doublesPlayoffStatus(t).done,false,
        "Dependent finals must be cleared when a pairing changes");
      assert.equal(t.doubles.playoffs.final.result,null);
    }else{
      assert.throws(()=>updateDoublesPlayoffResult(t,"thirdPlace",0,{score1:6,score2:2,winner:1}),
        /Ungültige Play-off/);
    }
  });
}
test("Doppel: Auswahl und Freigaben beeinflussen markierte Play-off-Ränge",()=>{
  const t=fixture(12,4);
  finishPrelim(t);
  settleOpenTies(t);
  const ranking=doublesStandings(t).ranking;
  t.doubles.playoffOptOut=[ranking[0].id];
  const preview=doublesPlayoffPreview(t);
  assert.equal(preview.ready,true);
  assert.equal(preview.eligible[0].id,ranking[1].id);
  const live=buildLiveDisplay(t);
  assert.equal(live.playoffSize,4);
  assert.equal(live.ranking.filter(x=>x.qualified).length,4);
  assert.equal(live.ranking[0].qualified,false);
  assert.equal(live.ranking[4].qualified,true);
  const html=renderLiveScreen(live);
  assert.match(html,/playoff-qualified/);
  assert.match(html,/live-standing-playoff-label/);
  const published=publicLiveSnapshot(t);
  assert.equal(published.playoffSize,4);
  assert.equal(published.ranking[0].qualified,false);
  t.doubles.playoffs=createDoublesPlayoffs(t);
  assert.equal(t.doubles.playoffs.seeds.includes(ranking[0].id),false);
});
test("Doppel: bisherige Turniere bleiben standardmäßig bei acht Play-off-Teams",()=>{
  const t=newTournament({type:"doubles",name:"Altbestand"});
  assert.equal(t.playoffSize,8);
  assert.equal(normalizeTournament({...t,playoffSize:9000}).playoffSize,8);
});
test("Doppel: 16er-Demo simuliert Achtelfinale bis Sieger samt Fernanzeige",()=>{
  const base=fixture(16,16);
  const t=newTournament(makeDemoCopy(base,16,{random:()=>0.4,makeId:(()=>{
    let n=0;return ()=>"demo-"+(++n);
  })()}));
  assert.equal(t.playoffSize,16);
  t.doubles.draw=generateDoublesDraw(t,{seed:5});
  t.doubles={...t.doubles,...fillDemoResults(t,()=>0.42).patch.doubles};
  assert.equal(doublesStandings(t).finished,true);
  settleOpenTies(t);
  t.doubles.playoffs=createDoublesPlayoffs(t);
  const result=fillDemoResults(t,()=>0.42);
  assert.equal(result.filled,16);
  t.doubles=result.patch.doubles;
  assert.equal(doublesPlayoffStatus(t).done,true);
  const display=buildLiveDisplay(t);
  assert.equal(display.playoffSize,16);
  assert.equal(display.ranking.length,16);
  assert.match(display.subtitle,/Top-16/);
});
