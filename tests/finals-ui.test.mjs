import test from "node:test";
import assert from "node:assert/strict";
import { BrowserTournamentStore } from "../site/assets/storage.js";
import { ribbonStandings } from "../site/assets/results.js";
import { ribbonFinalPreview, verifyRibbonFinals } from "../site/assets/finals.js";

test("Endrunde: Auswahl, automatische Halbfinal-/Finalpaarung, Korrektur und Rücknahme",async()=>{
  const memory=new Map();
  globalThis.localStorage={
    getItem(key){return memory.get(key)??null},
    setItem(key,value){memory.set(key,value)}
  };
  const setup=new BrowserTournamentStore();
  const t=setup.create({name:"Endrunde UI Test",rounds:4,courts:[1,2,3,4]});
  for(let i=0;i<8;i++){
    setup.upsertParticipant(t.id,{name:`Stark ${i}`,group:"stark",present:true});
    setup.upsertParticipant(t.id,{name:`Schwächer ${i}`,group:"schwaecher",present:true});
  }
  const root={innerHTML:""};
  const dialogRoot={innerHTML:"",querySelector(){return {addEventListener(){},showModal(){},close(){}}},replaceChildren(){}};
  const events={},notices=[];
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="dialog-root"?dialogRoot:{appendChild(el){notices.push(el.textContent)}}},
    addEventListener(type,callback){events[type]=callback},
    createElement(){return {className:"",textContent:"",remove(){}}},
    body:{appendChild(){}}
  };
  globalThis.window={addEventListener(){},scrollTo(){}};
  globalThis.confirm=()=>true;
  const timer=globalThis.setTimeout;
  globalThis.setTimeout=(cb,delay,...args)=>delay===4700?(cb(),0):timer(cb,delay,...args);
  globalThis.FormData=class {
    constructor(form){this.data=form.data??{}}
    get(k){return this.data[k]??null}
    has(k){return k in this.data}
  };
  await import("../site/assets/app.js");
  const read=()=>new BrowserTournamentStore().active();
  const click=(action,other={})=>events.click({target:{closest:()=>({dataset:{action,...other},matches:()=>false})}});
  const submit=(form,position,winner,s1="",s2="")=>events.submit({
    target:{closest:()=>({dataset:{form,...position},data:{winner:String(winner),score1:String(s1),score2:String(s2)}})},
    preventDefault(){}
  });
  const checkPlayer=(id,checked)=>events.change({target:{
    id:"",dataset:{id},checked,matches:x=>x.includes("final-participation")
  }});

  click("open-tournament",{id:t.id});
  click("tab",{tab:"draw"});
  click("draw-generate");
  click("tab",{tab:"finals"});
  assert.match(root.innerHTML,/Endrunde noch nicht bereit/);
  assert.match(root.innerHTML,/data-action="final-generate" disabled/);
  for(let r=0;r<read().draw.rounds.length;r++)
    for(let m=0;m<read().draw.rounds[r].matches.length;m++)
      submit("draw-result",{round:String(r),match:String(m)},(r+m)%2+1);
  click("tab",{tab:"finals"});
  assert.match(root.innerHTML,/Endrunde ist bereit/);

  click("final-size",{size:"16"});
  assert.equal(read().finalSize,16);
  assert.equal(ribbonFinalPreview(read()).eligible.length,16);
  click("final-size",{size:"8"});
  const candidate=ribbonFinalPreview(read()).eligible[0].id;
  const reserve=ribbonFinalPreview(read()).reserves[0].id;
  checkPlayer(candidate,false);
  assert.ok(read().finalOptOut.includes(candidate));
  assert.ok(ribbonFinalPreview(read()).eligible.some(p=>p.id===reserve));
  const before=ribbonStandings(read()).participants.map(p=>[p.id,p.ribbons,p.played]);
  click("final-generate");
  assert.ok(read().draw.finals);
  assert.deepEqual(read().draw.finals.rounds.map(r=>r.id),["semi","final"]);
  assert.match(root.innerHTML,/Halbfinale/);
  assert.match(root.innerHTML,/Sieger der vorherigen Begegnung/);
  assert.match(root.innerHTML,/data-form="final-result"/);
  assert.match(root.innerHTML,/disabled aria-label/);

  submit("final-result",{stage:"0",match:"0"},1,6,2);
  assert.match(root.innerHTML,/6 : 2/);
  submit("final-result",{stage:"0",match:"1"},2);
  submit("final-result",{stage:"1",match:"0"},1);
  assert.equal(verifyRibbonFinals(read()).complete,true);
  assert.match(root.innerHTML,/TURNIERSIEGER/);
  assert.deepEqual(ribbonStandings(read()).participants.map(p=>[p.id,p.ribbons,p.played]),before);

  click("final-edit-result",{stage:"0",match:"0"});
  assert.match(root.innerHTML,/data-action="final-cancel-edit"/);
  click("final-cancel-edit");
  assert.equal(read().draw.finals.rounds[0].matches[0].result.winner,1);

  click("final-edit-result",{stage:"0",match:"0"});
  submit("final-result",{stage:"0",match:"0"},2,2,6);
  assert.equal(read().draw.finals.rounds[1].matches[0].result,null);
  assert.equal(verifyRibbonFinals(read()).complete,false);
  click("final-reset");
  assert.equal(read().draw.finals,undefined);
  assert.equal(ribbonStandings(read()).complete,true);
  assert.ok(ribbonFinalPreview(read()).ready);
  assert.ok(notices.some(s=>s.includes("Endrunde zurückgenommen")));
});
