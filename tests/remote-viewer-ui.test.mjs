import test from "node:test";
import assert from "node:assert/strict";

test("Eigenständiger Zuschauerbrowser: Serverdaten, Ergebnisupdates und Widerruf",async()=>{
  const token="a".repeat(48);
  const events={},calls=[],connections=[];
  let interval,deleted=false;
  let rounds=0;
  const root={innerHTML:""};
  const connection={textContent:"",classList:{toggle(cls,value){connections.push([cls,value])}}};
  const footer={textContent:""};
  const clock={textContent:"",closest(){return {classList:{toggle(){}}}}};
  const clockStatus={textContent:""};
  const time={textContent:""};
  const fullscreen={addEventListener(){}};
  globalThis.document={
    getElementById(id){return ({
      "live-root":root,"live-connection":connection,"live-footer-help":footer,
      "live-current-time":time,"fullscreen-toggle":fullscreen
    })[id]||null},
    addEventListener(name,fn){events[name]=fn},
    querySelector(q){if(q==="[data-live-timer]")return root.innerHTML.includes("data-live-timer")?clock:null;
      if(q==="[data-live-status]")return clockStatus;
      return null;
    },
    hidden:false,fullscreenElement:null,
    documentElement:{requestFullscreen(){return Promise.resolve()}}
  };
  globalThis.window={
    location:{search:"",hash:"#kanal="+token},
    addEventListener(name,fn){events[name]=fn},
    setInterval(fn){interval=fn;return 1}
  };
  const dataset=()=>({ok:true,display:{
    mode:"round",name:"Club-Turnier",date:"2026-11-05",startTime:"10:00",
    index:0,title:"Runde 1",subtitle:"Vorrunde",
    progress:rounds,total:1,plannedStart:"10:00",plannedEnd:"10:20",
    timer:{status:"running",remainingMs:90000,overtimeMs:0,display:"01:30",expired:false},
    ranking:[{place:1,name:"Alex",ribbons:rounds,played:rounds}],
    matches:[{number:1,court:"Center",batch:1,left:["Alex","Kim"],right:["Pat","Chris"],
      winner:rounds?1:null,score1:rounds?6:null,score2:rounds?2:null,
      leftFillers:[],rightFillers:[],finished:rounds>0}]
  },savedAt:Date.now()-1000,serverNow:Date.now()});
  globalThis.fetch=async(url,opts)=>{
    calls.push({url,opts});
    return deleted?
      {ok:false,status:404,json:async()=>({ok:false,error:"Link beendet"})}:
      {ok:true,status:200,json:async()=>dataset()};
  };
  await import("../site/assets/live.js");
  const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
  await flush();
  assert.ok(interval);
  assert.match(root.innerHTML,/Club-Turnier/);
  assert.match(root.innerHTML,/Alex/);
  assert.match(connection.textContent,/LIVE VOM SERVER/);
  assert.match(footer.textContent,/unabhängig vom Gerät/);
  assert.equal(calls[0].opts.headers["X-Tennilo-Channel"],token);
  assert.equal(calls[0].url,"./live-feed.php");
  rounds=1;
  events.focus();
  await flush();
  assert.match(root.innerHTML,/ERGEBNIS/);
  assert.match(root.innerHTML,/6/);
  deleted=true;
  events.focus();
  await flush();
  assert.match(root.innerHTML,/wurde beendet oder der Link ist abgelaufen/);
  assert.match(connection.textContent,/VERBINDUNG UNTERBROCHEN/);
});
