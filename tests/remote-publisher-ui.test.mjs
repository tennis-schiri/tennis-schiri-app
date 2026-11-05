import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";

test("Turnierleitung: Fernanzeige aktivieren, Link kopieren, Freigabe widerrufen",async()=>{
  const memory=new Map();
  globalThis.localStorage={
    getItem(k){return memory.get(k)??null},
    setItem(k,v){memory.set(k,v)},
    removeItem(k){memory.delete(k)}
  };
  const manager=new BrowserTournamentStore();
  const tournament=manager.create({name:"Turnierleitung",rounds:4,courts:[1,2,3,4]});
  const notices=[],events={},calls=[];
  const root={innerHTML:""};
  const dialog={innerHTML:"",querySelector(){return {showModal(){},close(){},addEventListener(){}}},replaceChildren(){}};
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="dialog-root"?dialog:{appendChild(el){notices.push(el.textContent)}}},
    addEventListener(name,fn){events[name]=fn},
    createElement(){return {className:"",textContent:"",remove(){}}},
    body:{appendChild(){}}
  };
  globalThis.window={
    location:{href:"https://app.tennis-schiri.de/index.html"},
    crypto:{getRandomValues(bytes){for(let i=0;i<bytes.length;i++)bytes[i]=(i+Math.floor(Math.random()*255))%256;return bytes}},
    addEventListener(){},scrollTo(){},
    setInterval(fn){globalThis.livePulse=fn;return 7;}
  };
  globalThis.confirm=()=>true;
  const savedTimeout=globalThis.setTimeout;
  globalThis.setTimeout=(cb,delay,...args)=>delay===4700?(cb(),0):savedTimeout(cb,delay,...args);
  let copied="";
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{clipboard:{
    writeText:async s=>{copied=s}
  }}});
  globalThis.fetch=async(url,opts)=>{
    calls.push({url,method:opts.method,payload:JSON.parse(opts.body)});
    return {ok:true,status:200,json:async()=>({ok:true})};
  };
  await import("../site/assets/app.js");
  const click=(action,extra={})=>events.click({target:{closest:()=>({dataset:{action,...extra},matches:()=>false})}});
  const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
  click("open-tournament",{id:tournament.id});
  assert.match(root.innerHTML,/Fernanzeige für andere Geräte/);
  assert.match(root.innerHTML,/Fernanzeige aktivieren/);
  click("remote-start");
  await flush();
  assert.match(root.innerHTML,/Live-Link kopieren/);
  const key=JSON.parse(memory.get("tennilo-live-share-v1:"+tournament.id));
  assert.equal(key.channel.length,48);
  assert.equal(key.writer.length,48);
  assert.notEqual(key.channel,key.writer);
  assert.equal(calls[0].payload.action,"publish");
  assert.equal(calls[0].payload.display.mode,"waiting");
  assert.doesNotMatch(JSON.stringify(calls[0].payload.display),/feePaid|feeTier|entryFee/);
  click("remote-copy");
  await flush();
  assert.match(copied,/live.html#kanal=[0-9a-f]{48}/);
  assert.doesNotMatch(copied,new RegExp(key.writer));
  click("remote-stop");
  await flush();
  assert.equal(calls.at(-1).payload.action,"stop");
  assert.equal(memory.has("tennilo-live-share-v1:"+tournament.id),false);
  assert.match(root.innerHTML,/Fernanzeige aktivieren/);
  assert.ok(notices.some(msg=>msg.includes("beendet")));
});
