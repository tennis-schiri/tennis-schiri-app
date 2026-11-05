import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";
import {feesOverview,clockFor} from "../site/assets/operations.js";

test("Bar-Kasse und Rundenuhr lassen sich bedienen und bleiben im Speicher",async()=>{
  const values=new Map();
  globalThis.localStorage={
    getItem(key){return values.get(key)??null},
    setItem(key,v){values.set(key,v)}
  };
  const setup=new BrowserTournamentStore();
  const t=setup.create({name:"Schleifchenturnier",rounds:4,courts:[1,2,3,4],
    entryFeeCents:750,date:"2026-11-05",startTime:"10:00",duration:20,breakMinutes:10});
  for(let i=0;i<8;i++){
    setup.upsertParticipant(t.id,{name:`Stark ${i}`,group:"stark",present:true});
    setup.upsertParticipant(t.id,{name:`Schwächer ${i}`,group:"schwaecher",present:true});
  }
  const root={innerHTML:""};
  const dialogRoot={
    innerHTML:"",querySelector(){return {addEventListener(){},showModal(){},close(){}};},
    replaceChildren(){}
  };
  const events={},messages=[];
  const fakeClockElement={dataset:{clockValue:"0"},textContent:"",className:""};
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="dialog-root"?dialogRoot:{appendChild(el){messages.push(el.textContent);}};},
    addEventListener(kind,fn){events[kind]=fn;},
    createElement(){return {className:"",textContent:"",remove(){}};},
    querySelectorAll(){return [fakeClockElement];},
    querySelector(){return {textContent:""};},
    body:{appendChild(){}}
  };
  let pulse=null;
  globalThis.window={addEventListener(){},scrollTo(){},setInterval(fn){pulse=fn;return 1;}};
  globalThis.confirm=()=>true;
  const timer=globalThis.setTimeout;
  globalThis.setTimeout=(fn,delay,...args)=>delay===4700?(fn(),0):timer(fn,delay,...args);
  globalThis.FormData=class{
    constructor(form){this.data=form.data??{};}
    get(k){return this.data[k]??null;}
    has(k){return k in this.data;}
  };
  await import("../site/assets/app.js");
  const read=()=>new BrowserTournamentStore().active();
  const click=(action,more={})=>events.click({target:{closest:()=>({dataset:{action,...more},matches:()=>false})}});
  const submit=(form,data)=>events.submit({target:{closest:()=>({dataset:{form},data})},preventDefault(){}});

  click("open-tournament",{id:t.id});
  click("tab",{tab:"fees"});
  assert.match(root.innerHTML,/Nenngeld/);
  assert.match(root.innerHTML,/120,00/);
  assert.match(root.innerHTML,/Rest bar erhalten/);
  const player=read().participants[0];
  click("fee-full",{id:player.id});
  assert.equal(read().participants[0].feePaidCents,750);
  assert.equal(feesOverview(read()).received,750);
  assert.match(root.innerHTML,/Bar bezahlt/);

  click("fee-edit",{id:player.id});
  assert.match(dialogRoot.innerHTML,/Insgesamt bar erhalten/);
  submit("cash-payment",{playerId:player.id,cashPaid:"4,50"});
  assert.equal(read().participants[0].feePaidCents,450);
  assert.equal(feesOverview(read()).open,11550);
  assert.match(root.innerHTML,/Teilzahlung/);
  click("tab",{tab:"participants"});
  click("edit-player",{id:player.id});
  assert.match(dialogRoot.innerHTML,/Individuelles Nenngeld/);
  submit("edit-player",{playerId:player.id,name:player.name,group:"stark",present:"on",feeOverride:"5,00"});
  assert.equal(read().participants[0].feeOverrideCents,500);
  assert.equal(read().participants[0].feePaidCents,450);
  click("tab",{tab:"fees"});
  assert.equal(feesOverview(read()).open,11300);

  click("tab",{tab:"draw"});
  click("draw-generate");
  assert.match(root.innerHTML,/Plan 10:00–10:20 Uhr/);
  assert.match(root.innerHTML,/10:00–10:20 Uhr/);
  assert.match(root.innerHTML,/Runde starten/);
  click("round-clock",{round:"0",clockAction:"start"});
  assert.equal(clockFor(read(),0).status,"running");
  assert.ok(Number.isSafeInteger(read().roundClocks["0"].firstStartedAt));
  assert.match(root.innerHTML,/Pausieren/);
  assert.ok(pulse);
  pulse();
  assert.ok(fakeClockElement.textContent.length>=5);
  click("round-clock",{round:"1",clockAction:"start"});
  assert.equal(clockFor(read(),1).status,"ready");
  assert.ok(messages.some(s=>s.includes("läuft noch")));

  click("round-clock",{round:"0",clockAction:"pause"});
  assert.equal(clockFor(read(),0).status,"paused");
  const again=new BrowserTournamentStore();
  assert.equal(clockFor(again.active(),0).status,"paused");
  click("round-clock",{round:"0",clockAction:"resume"});
  assert.equal(clockFor(read(),0).status,"running");
  click("round-clock",{round:"0",clockAction:"finish"});
  assert.equal(clockFor(read(),0).status,"finished");
  click("round-clock",{round:"0",clockAction:"reset"});
  assert.equal(clockFor(read(),0).status,"ready");
  const saved=setup.exportJson(); // setup instance ist älter; reinen neuen Zustand exportieren
  const backup=new BrowserTournamentStore().exportJson();
  const imported=new BrowserTournamentStore();
  imported.importJson(backup);
  assert.equal(imported.active().participants[0].feePaidCents,450);
  assert.equal(imported.active().entryFeeCents,750);
  assert.ok(messages.some(s=>s.includes("Runde gestartet")));
});
