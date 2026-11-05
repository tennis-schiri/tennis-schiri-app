import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";

test("Turnierleitung kann die Monitorseite öffnen und sichtbare Runde wählen",async()=>{
  const items=new Map();
  globalThis.localStorage={
    getItem(k){return items.get(k)??null},
    setItem(k,v){items.set(k,v)}
  };
  const setup=new BrowserTournamentStore();
  const t=setup.create({name:"Monitor Test",startTime:"09:30",rounds:4,courts:[1,2,3,4]});
  for(let i=0;i<8;i++){
    setup.upsertParticipant(t.id,{name:"Stark "+i,group:"stark",present:true});
    setup.upsertParticipant(t.id,{name:"Schwächer "+i,group:"schwaecher",present:true});
  }
  const root={innerHTML:""};
  const dlg={innerHTML:"",querySelector(){return {addEventListener(){},showModal(){},close(){}}},replaceChildren(){}};
  const handlers={},notice=[];
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="dialog-root"?dlg:{appendChild(x){notice.push(x.textContent)}}},
    addEventListener(name,fn){handlers[name]=fn},
    createElement(){return {textContent:"",className:"",remove(){}}},
    body:{appendChild(){}}
  };
  globalThis.window={addEventListener(){},scrollTo(){}};
  globalThis.confirm=()=>true;
  const oldTimeout=globalThis.setTimeout;
  globalThis.setTimeout=(fn,delay,...args)=>delay===4700?(fn(),0):oldTimeout(fn,delay,...args);
  globalThis.FormData=class{
    constructor(form){this.data=form.data??{}}
    get(k){return this.data[k]??null}
    has(k){return k in this.data}
  };
  await import("../site/assets/app.js");
  const read=()=>new BrowserTournamentStore().active();
  const click=(action,more={})=>handlers.click({target:{closest:()=>({dataset:{action,...more},matches:()=>false})}});
  click("open-tournament",{id:t.id});
  assert.match(root.innerHTML,/Live-Monitor öffnen/);
  assert.match(root.innerHTML,/live.html\?turnier=/);
  assert.match(root.innerHTML,/target="_blank" rel="noopener"/);
  click("tab",{tab:"draw"});
  click("draw-generate");
  assert.match(root.innerHTML,/Diese Runde live zeigen/);
  assert.match(root.innerHTML,/Monitor: Automatische Rundenauswahl/);
  click("live-round",{round:"1"});
  assert.deepEqual(read().liveDisplay,{mode:"round",index:1});
  assert.match(root.innerHTML,/Auf Live-Monitor ausgewählt/);
  const restored=new BrowserTournamentStore();
  assert.deepEqual(restored.active().liveDisplay,{mode:"round",index:1});
  click("live-auto");
  assert.equal(read().liveDisplay,null);
  assert.ok(notice.some(x=>x.includes("automatisch")));
  click("live-round",{round:"999"});
  assert.equal(read().liveDisplay,null);
  assert.ok(notice.some(x=>x.includes("noch nicht gültig ausgelost")));
  click("live-round",{round:"2"});
  click("draw-generate");
  assert.equal(read().liveDisplay,null);
});
