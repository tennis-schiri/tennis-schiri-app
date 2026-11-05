import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";
import {generateRibbonDraw} from "../site/assets/draw.js";
import {updateRibbonMatchResult} from "../site/assets/results.js";
import {changeRoundClock} from "../site/assets/operations.js";

test("Zweites Fenster übernimmt Spielplan, Ergebnisse und laufende Uhr nach Speicherereignis",async()=>{
  const cache=new Map();
  globalThis.localStorage={getItem(k){return cache.get(k)??null},setItem(k,v){cache.set(k,v)}};
  const setup=new BrowserTournamentStore();
  const t=setup.create({name:"Live Monitor Demo",startTime:"10:00",rounds:4,courts:[1,2,3,4]});
  for(let i=0;i<8;i++){
    setup.upsertParticipant(t.id,{name:"S "+i,group:"stark",present:true});
    setup.upsertParticipant(t.id,{name:"W "+i,group:"schwaecher",present:true});
  }
  const root={innerHTML:""};
  const clockElement={textContent:"",closest(){return {classList:{toggle(){}}}}};
  const statusElement={textContent:""};
  const displayTime={textContent:""};
  const fullScreenButton={addEventListener(){}};
  const onWindow={},onDocument={};
  let pulse;
  globalThis.window={
    location:{search:"?turnier="+encodeURIComponent(t.id)},
    setInterval(fn){pulse=fn;return 1},
    addEventListener(name,fn){onWindow[name]=fn}
  };
  globalThis.document={
    getElementById(id){return id==="live-root"?root:id==="live-current-time"?displayTime:fullScreenButton},
    querySelector(q){if(q==="[data-live-timer]")return root.innerHTML.includes("data-live-timer")?clockElement:null;
      if(q==="[data-live-status]")return statusElement;
      return null;
    },
    addEventListener(name,fn){onDocument[name]=fn},
    documentElement:{requestFullscreen(){return Promise.resolve()}},
    fullscreenElement:null,
    hidden:false
  };
  await import("../site/assets/live.js");
  assert.match(root.innerHTML,/Warten auf die Auslosung/);
  assert.ok(pulse);
  const read=()=>new BrowserTournamentStore().active();
  const edit=patch=>new BrowserTournamentStore().editTournament(t.id,patch);
  edit({draw:generateRibbonDraw(read(),{seed:8})});
  onWindow.storage({key:"tennis-schiri-tournaments-v1"});
  assert.match(root.innerHTML,/Runde 1/);
  assert.match(root.innerHTML,/S 0|S 1|S 2/);
  assert.doesNotMatch(root.innerHTML,/Nenngeld|Barzahlung/);
  const changed=updateRibbonMatchResult(read(),0,0,{winner:1,score1:6,score2:1});
  edit({draw:changed});
  onWindow.storage({key:"tennis-schiri-tournaments-v1"});
  assert.match(root.innerHTML,/ERGEBNIS/);
  assert.match(root.innerHTML,/6/);
  const now=Date.now()-15000;
  edit({roundClocks:changeRoundClock(read(),0,"start",now)});
  onWindow.storage({key:"tennis-schiri-tournaments-v1"});
  pulse();
  assert.match(clockElement.textContent,/^19:/);
  assert.ok(displayTime.textContent.includes(":"));
  edit({liveDisplay:{mode:"round",index:1}});
  onWindow.storage({key:"tennis-schiri-tournaments-v1"});
  assert.match(root.innerHTML,/Runde 2/);
  edit({liveDisplay:null});
  pulse();
  assert.match(root.innerHTML,/Runde 1/);
});
