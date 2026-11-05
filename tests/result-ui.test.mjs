import test from "node:test";
import assert from "node:assert/strict";
import { BrowserTournamentStore } from "../site/assets/storage.js";
import { ribbonStandings } from "../site/assets/results.js";

// Node-Bedientest ohne Browser-Abhängigkeiten: simuliert Events, DOM-Container
// und die browserseitige Speicherung. Echte Browser-End-to-End-Tests folgen.
test("Gespeichertes Ergebnis kompakt anzeigen, Sieger hervorheben und erneut bearbeiten", async () => {
  const memory = new Map();
  globalThis.localStorage = {
    getItem(key) { return memory.get(key) ?? null; },
    setItem(key, value) { memory.set(key, value); }
  };
  const setup = new BrowserTournamentStore();
  const t = setup.create({name:"UI-Test",rounds:4,courts:[1,2,3,4]});
  for (let i=0;i<8;i++) setup.upsertParticipant(t.id,{name:`Stark ${i}`,group:"stark",present:true});
  for (let i=0;i<8;i++) setup.upsertParticipant(t.id,{name:`Schwächer ${i}`,group:"schwaecher",present:true});

  const root = {innerHTML:""};
  const dialogRoot = {innerHTML:"",querySelector(){return {addEventListener(){},showModal(){},close(){}};},replaceChildren(){}};
  const notices = [];
  const eventHandlers = {};
  globalThis.document = {
    getElementById(id) { return id==="app"?root:id==="dialog-root"?dialogRoot:{appendChild(el){notices.push(el.textContent);}}; },
    addEventListener(type, handler) { eventHandlers[type]=handler; },
    createElement() { return {className:"",textContent:"",remove(){}}; },
    body:{appendChild(){}}
  };
  globalThis.window = {addEventListener(){},scrollTo(){}};
  globalThis.confirm = () => true;
  globalThis.setTimeout = () => 0;
  globalThis.FormData = class {
    constructor(form) { this.data=form.data??{}; }
    get(key) { return this.data[key]??null; }
    has(key) { return key in this.data; }
  };

  // App initiiert ihren eigenen Store bei Modulimport; Daten wurden vorher angelegt.
  await import("../site/assets/app.js");
  const click = (action, options={}) => eventHandlers.click({
    target:{closest:()=>({dataset:{action,...options},matches:()=>false})}
  });
  const submitResult = (round,match,data) => eventHandlers.submit({
    target:{closest:()=>({dataset:{form:"draw-result",round:String(round),match:String(match)},data})},
    preventDefault(){}
  });
  const firstMatch = () => root.innerHTML.match(/<article class="draw-match[^"]*">[\s\S]*?<\/article>/)?.[0]??"";

  click("open-tournament",{id:t.id});
  click("tab",{tab:"draw"});
  click("draw-generate");
  assert.match(firstMatch(),/class="draw-result-form"/);
  assert.doesNotMatch(firstMatch(),/data-action="draw-edit-result"/);

  submitResult(0,0,{score1:"6",score2:"3",winner:"1"});
  assert.doesNotMatch(firstMatch(),/class="draw-result-form"/);
  assert.match(firstMatch(),/<strong>6<span>:<\/span>3<\/strong>/);
  assert.match(firstMatch(),/class="draw-team is-winner"/);
  assert.match(firstMatch(),/draw-winner-pill/);
  assert.match(firstMatch(),/data-action="draw-edit-result"/);
  assert.equal(ribbonStandings(new BrowserTournamentStore().active()).completeMatches,1);

  click("draw-edit-result",{round:"0",match:"0"});
  assert.match(firstMatch(),/class="draw-result-form"/);
  assert.match(firstMatch(),/name="score1"[^>]*value="6"/);
  assert.match(firstMatch(),/name="winner"/);
  assert.match(firstMatch(),/data-action="draw-cancel-edit"/);
  click("draw-cancel-edit");
  assert.doesNotMatch(firstMatch(),/class="draw-result-form"/);
  assert.match(firstMatch(),/<strong>6<span>:<\/span>3<\/strong>/);
  assert.equal(ribbonStandings(new BrowserTournamentStore().active()).completeMatches,1);

  click("draw-edit-result",{round:"0",match:"0"});
  submitResult(0,0,{score1:"2",score2:"6",winner:"2"});
  assert.match(firstMatch(),/<strong>2<span>:<\/span>6<\/strong>/);
  assert.doesNotMatch(firstMatch(),/class="draw-result-form"/);
  assert.equal((firstMatch().match(/class="draw-team is-winner"/g)??[]).length,1);
  assert.ok(firstMatch().indexOf('class="draw-team is-loser"') <
            firstMatch().indexOf('class="draw-team is-winner"'));

  click("home");
  click("open-tournament",{id:t.id});
  click("tab",{tab:"draw"});
  assert.match(firstMatch(),/<strong>2<span>:<\/span>6<\/strong>/);
  assert.doesNotMatch(firstMatch(),/class="draw-result-form"/);
  assert.equal(ribbonStandings(new BrowserTournamentStore().active()).completeMatches,1);
  assert.ok(notices.includes("Ergebnis und Schleifen gespeichert."));
});
