import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";
import {feesOverview} from "../site/assets/operations.js";

test("Gemeinsamer Check-in: Anwesenheit, Jugend/Erwachsene und Bar-Nenngeld",async()=>{
  const values=new Map();
  globalThis.localStorage={
    getItem(k){return values.get(k)??null;},
    setItem(k,v){values.set(k,v);}
  };
  const db=new BrowserTournamentStore();
  const t=db.create({name:"Jugend und Erwachsene",entryFeeCents:1000});
  db.upsertParticipant(t.id,{name:"Alex",group:"stark",present:true});
  db.upsertParticipant(t.id,{name:"Chris",group:"schwaecher",present:true});
  const root={innerHTML:""},dialog={innerHTML:"",querySelector(){return {addEventListener(){},showModal(){},close(){}}},replaceChildren(){}};
  const messages=[],events={};
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="dialog-root"?dialog:{appendChild(el){messages.push(el.textContent)}}},
    addEventListener(k,fn){events[k]=fn},
    createElement(){return {className:"",textContent:"",remove(){}}},
    body:{appendChild(){}}
  };
  globalThis.window={addEventListener(){},scrollTo(){}};
  let agrees=true;
  globalThis.confirm=()=>agrees;
  const timer=globalThis.setTimeout;
  globalThis.setTimeout=(fn,delay,...args)=>delay===4700?(fn(),0):timer(fn,delay,...args);
  globalThis.FormData=class {
    constructor(form){this.data=form.data??{}}
    get(k){return this.data[k]??null}
    has(k){return k in this.data}
  };
  await import("../site/assets/app.js");
  const read=()=>new BrowserTournamentStore().active();
  const click=(action,other={})=>events.click({target:{closest:()=>({dataset:{action,...other},matches:()=>false})}});
  const submit=(form,data)=>events.submit({target:{closest:()=>({dataset:{form},data})},preventDefault(){}});
  const change=(kind,id,value,checked)=>events.change({target:{
    id:"",dataset:{id},value,checked,matches:x=>kind==="tier"?x.includes("participant-tier"):x.includes("presence")
  }});

  click("open-tournament",{id:t.id});
  click("tab",{tab:"participants"});
  assert.match(root.innerHTML,/Teilnehmende & Nenngeld/);
  assert.match(root.innerHTML,/Check-in & Kassenliste/);
  assert.match(root.innerHTML,/data-action="presence"/);
  assert.match(root.innerHTML,/data-action="participant-tier"/);
  assert.match(root.innerHTML,/data-action="fee-full"/);
  assert.doesNotMatch(root.innerHTML,/data-tab="fees"/);
  assert.match(root.innerHTML,/20,00/);

  click("tab",{tab:"settings"});
  assert.match(root.innerHTML,/Nenngeld-Kategorien/);
  click("fee-category-add");
  assert.match(dialog.innerHTML,/Neue Nenngeld-Kategorie/);
  submit("fee-category",{categoryId:"",categoryName:"Jugend",categoryAmount:"5,00"});
  assert.equal(read().feeCategories.length,2);
  const youth=read().feeCategories.find(x=>x.name==="Jugend");
  click("fee-category-add");
  submit("fee-category",{categoryId:"",categoryName:"Erwachsene",categoryAmount:"12,00"});
  assert.equal(read().feeCategories.length,3);
  const adults=read().feeCategories.find(x=>x.name==="Erwachsene");

  click("tab",{tab:"participants"});
  const alex=read().participants[0],chris=read().participants[1];
  change("tier",alex.id,youth.id);
  change("tier",chris.id,adults.id);
  assert.equal(feesOverview(read()).expected,1700);
  assert.match(root.innerHTML,/Jugend – 5,00/);
  assert.match(root.innerHTML,/Erwachsene – 12,00/);
  change("presence",chris.id,undefined,false);
  assert.equal(read().participants[1].present,false);
  assert.equal(feesOverview(read()).expected,1700);

  click("fee-full",{id:alex.id});
  assert.equal(read().participants[0].feePaidCents,500);
  assert.match(root.innerHTML,/Bar bezahlt/);
  click("fee-edit",{id:chris.id});
  submit("cash-payment",{playerId:chris.id,cashPaid:"6,00"});
  assert.equal(read().participants[1].feePaidCents,600);
  assert.equal(feesOverview(read()).open,600);
  assert.match(root.innerHTML,/Teilzahlung/);
  click("tab",{tab:"settings"});
  click("fee-category-edit",{id:youth.id});
  submit("fee-category",{categoryId:youth.id,categoryName:"Jugend",categoryAmount:"7,00"});
  assert.equal(feesOverview(read()).open,800);
  assert.equal(feesOverview(read()).received,1100);
  click("fee-category-remove",{id:youth.id});
  assert.ok(read().feeCategories.some(c=>c.id===youth.id));
  assert.ok(messages.some(m=>m.includes("Zuerst die Teilnehmer")));

  click("tab",{tab:"participants"});
  const backup=new BrowserTournamentStore().exportJson();
  const restored=new BrowserTournamentStore();
  restored.importJson(backup);
  assert.equal(restored.active().participants[0].feeTierId,youth.id);
  assert.equal(restored.active().participants[1].feePaidCents,600);
  assert.equal(restored.active().participants[1].present,false);
  assert.equal(restored.active().feeCategories.length,3);
});
