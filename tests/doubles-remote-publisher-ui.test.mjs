import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";
import {generateDoublesDraw} from "../site/assets/doubles.js";

test("Doppel-Turnierleitung: Opt-in, Teamdaten, Link kopieren und Freigabe widerrufen",async()=>{
  const saved=new Map(),calls=[],events={},notices=[];
  globalThis.localStorage={
    getItem(key){return saved.get(key)??null},
    setItem(key,value){saved.set(key,value)},
    removeItem(key){saved.delete(key)}
  };
  const manager=new BrowserTournamentStore();
  const created=manager.create({type:"doubles",name:"Doppel-Verein",
    rounds:4,courts:[1,2,3,4],duration:20,breakMinutes:10,startTime:"10:00"});
  const teams=Array.from({length:8},(_,i)=>({
    id:"t"+i,player1:"Team "+i+" A",player2:"Team "+i+" B",present:true,
    tier1:"standard",tier2:"standard",paid1:9999,paid2:15000
  }));
  manager.editTournament(created.id,{doubles:{...created.doubles,teams}});
  const t=manager.active();
  manager.editTournament(t.id,{doubles:{...t.doubles,draw:generateDoublesDraw(t,{seed:17})}});

  const root={innerHTML:""},notice={replaceChildren(el){notices.push(el.textContent)}};
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="toast-region"?notice:dialog},
    addEventListener(name,handler){events[name]=handler},
    createElement(){return {className:"",textContent:"",setAttribute(){},remove(){}}},
    querySelectorAll(){return []},
    body:{appendChild(){}}
  };
  const dialog={innerHTML:"",querySelector(){return {showModal(){},close(){},addEventListener(){}}},replaceChildren(){}};
  let pulse,copied="",opened="";
  globalThis.window={
    location:{href:"https://app.tennis-schiri.de/doppel.html",hash:"",pathname:"/doppel.html",search:""},
    crypto:{getRandomValues(bytes){for(let i=0;i<bytes.length;i++)bytes[i]=(i+17)%256;return bytes}},
    addEventListener(){},
    open(url){opened=url},
    setTimeout(){},
    setInterval(fn){pulse=fn}
  };
  globalThis.history={replaceState(){}};
  globalThis.confirm=()=>true;
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{
    clipboard:{writeText:async(value)=>{copied=value}}
  }});
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    return {ok:true,status:200,json:async()=>({ok:true})};
  };
  await import("../site/assets/doppel-ui.js");
  const click=(act,extra={})=>events.click({
    target:{closest:()=>({dataset:{act,...extra},matches:()=>false})}
  });
  const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};

  assert.match(root.innerHTML,/Fernanzeige aktivieren/);
  click("live-local");
  assert.match(opened,/live.html\?turnier=/);
  assert.ok(opened.includes(encodeURIComponent(created.id)));
  click("remote-start");
  await flush();
  assert.match(root.innerHTML,/Zuschauer-Link kopieren/);
  assert.equal(calls[0].options.method,"POST");
  const first=JSON.parse(calls[0].options.body);
  assert.equal(first.display.format,"doubles");
  assert.equal(first.display.mode,"round");
  assert.ok(first.display.matches.length);
  for(const forbidden of ["paid1","paid2","9999","15000","feeTier","present","entryFee"]) {
    assert.doesNotMatch(JSON.stringify(first.display),new RegExp(forbidden));
  }
  const keys=JSON.parse(saved.get("tennilo-live-share-v1:"+created.id));
  assert.equal(keys.channel.length,48);
  assert.equal(keys.writer.length,48);
  assert.notEqual(keys.channel,keys.writer);
  click("remote-copy");
  await flush();
  assert.match(copied,/live.html#kanal=[a-f0-9]{48}/);
  assert.ok(!copied.includes(keys.writer));

  click("live-round",{round:"1"});
  assert.equal(manager.load().tournaments[0].liveDisplay.index,1);
  assert.ok(pulse);
  click("remote-stop");
  await flush();
  const last=JSON.parse(calls.at(-1).options.body);
  assert.equal(last.action,"stop");
  assert.equal(saved.has("tennilo-live-share-v1:"+created.id),false);
  assert.match(root.innerHTML,/Fernanzeige aktivieren/);
  assert.ok(notices.some(item=>item.includes("beendet")));
});
