import test from "node:test";
import assert from "node:assert/strict";
import { BrowserTournamentStore } from "../site/assets/storage.js";
import { ribbonStandings } from "../site/assets/results.js";

test("Auffüllrunde erst nach Vorrunde, ungewertete Auffüller, Korrektur via Zurücknehmen",async()=>{
  const memory=new Map();
  globalThis.localStorage={
    getItem(key){return memory.get(key)??null},
    setItem(key,value){memory.set(key,value)}
  };
  const db=new BrowserTournamentStore();
  const tournament=db.create({name:"Auffüller-UI-Test",rounds:3,courts:[1,2,3]});
  for(let i=0;i<5;i++){
    db.upsertParticipant(tournament.id,{name:`Starker ${i}`,group:"stark",present:true});
    db.upsertParticipant(tournament.id,{name:`Schwächerer ${i}`,group:"schwaecher",present:true});
  }
  const root={innerHTML:""};
  const dialogRoot={innerHTML:"",querySelector(){return {addEventListener(){},showModal(){},close(){}}},replaceChildren(){}};
  const handlers={},notices=[];
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="dialog-root"?dialogRoot:{appendChild(el){notices.push(el.textContent)}}},
    addEventListener(type,fn){handlers[type]=fn},
    createElement(){return {textContent:"",className:"",remove(){}}},
    body:{appendChild(){}}
  };
  globalThis.window={addEventListener(){},scrollTo(){}};
  globalThis.confirm=()=>true;
  globalThis.FormData=class {
    constructor(form){this.data=form.data??{}}
    get(key){return this.data[key]??null}
    has(key){return key in this.data}
  };
  await import("../site/assets/app.js");
  const click=(action,extra={})=>handlers.click({target:{closest:()=>({dataset:{action,...extra},matches:()=>false})}});
  const submit=(round,match,winner)=>handlers.submit({
    target:{closest:()=>({dataset:{form:"draw-result",round:String(round),match:String(match)},data:{winner:String(winner),score1:"",score2:""}})},
    preventDefault(){}
  });
  const read=()=>new BrowserTournamentStore().active();

  click("open-tournament",{id:tournament.id});
  click("tab",{tab:"draw"});
  click("draw-generate");
  assert.match(root.innerHTML,/data-action="draw-special-generate" disabled/);
  click("draw-special-generate");
  assert.equal(read().draw.specialRound,undefined);
  assert.ok(notices.some(s=>s.includes("alle normalen Ergebnisse")));

  for(let i=0;i<read().draw.rounds.length;i++){
    for(let j=0;j<read().draw.rounds[i].matches.length;j++)submit(i,j,(i+j)%2?1:2);
  }
  const before=ribbonStandings(read());
  assert.equal(before.complete,true);
  assert.match(root.innerHTML,/Auslosung bereit/);
  click("draw-special-generate");
  assert.ok(read().draw.specialRound);
  assert.match(root.innerHTML,/Auffüllrunde<\/strong>/);
  assert.match(root.innerHTML,/Auffüller · ohne Wertung/);
  assert.match(root.innerHTML,/data-action="draw-special-reset"/);
  assert.match(root.innerHTML,/disabled title="Bitte zuerst die Auffüllrunde zurücknehmen\."/);

  const match=read().draw.specialRound.matches[0];
  const fillerIds=match.slots.filter((_,i)=>match.fillerMask[i]);
  const old=new Map(ribbonStandings(read()).participants.map(p=>[p.id,{played:p.played,ribbons:p.ribbons}]));
  const extraRound=read().draw.rounds.length;
  submit(extraRound,0,1);
  const after=ribbonStandings(read());
  assert.equal(after.specialProgress.complete,true);
  assert.equal(after.finished,true);
  for(const id of fillerIds){
    const p=after.participants.find(x=>x.id===id);
    assert.equal(p.played,old.get(id).played);
    assert.equal(p.ribbons,old.get(id).ribbons);
  }
  assert.match(root.innerHTML,/Auffüllrunde abgeschlossen/);
  click("draw-special-reset");
  assert.equal(read().draw.specialRound,undefined);
  assert.equal(ribbonStandings(read()).completeMatches,before.completeMatches);
  assert.equal(ribbonStandings(read()).specialProgress,null);
  assert.match(root.innerHTML,/data-action="draw-special-generate"/);
  click("draw-edit-result",{round:"0",match:"0"});
  assert.match(root.innerHTML,/data-action="draw-cancel-edit"/);
});
