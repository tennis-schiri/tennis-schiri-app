import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {BrowserTournamentStore} from "../site/assets/storage.js";

const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=file("site/opc.html"),ui=file("site/assets/one-point-ui.js"),
  model=file("site/assets/one-point.js"),home=file("site/assets/app.js"),
  workflow=file(".github/workflows/deploy.yml");

test("One Point Cup hat eine separate responsive TENNILO-Oberfläche",()=>{
  assert.match(page,/one-point-ui\.js\?v=095/);
  assert.match(page,/one-point\.css\?v=080/);
  assert.match(page,/noindex,nofollow/);
  assert.match(file("site/assets/one-point.css"),/@media\(max-width:480px\)/);
  assert.match(home,/One Point Cup starten/);
  assert.match(home,/opc-new/);
  assert.match(home,/opc\.html/);
});

test("One Point Cup hat Spieler, Check-in, Bar-Nenngeld, K.-o.-Sieger und Sicherung",()=>{
  for(const value of ["player-add","player-edit","player-remove","cash","player-import",
    "draw-generate","draw-reset","winner","winner-reset","backup","import-json",
    "settings","delete"]) {
    assert.ok(ui.includes('act==="'+value+'"')||ui.includes('data-act="'+value+'"'),value);
  }
  assert.match(ui,/store\.exportJson\(\)/);
  assert.match(ui,/store\.importJson\(raw\)/);
  assert.match(ui,/file\.size>3000000/);
  assert.match(model,/export function setOnePointWinner/);
  assert.doesNotMatch(ui,/\bfetch\s*\(|Stripe|PayPal|Mollie/);
});

test("One Point Cup bleibt im manuellen FTPS-Deploy und Backend bleibt draußen",()=>{
  assert.match(workflow,/workflow_dispatch/);
  assert.match(workflow,/if: github\.event_name == 'workflow_dispatch'/);
  for(const path of ["site/opc.html","site/assets/one-point-ui.js",
    "site/assets/one-point.js","site/assets/one-point.css"])
    assert.ok(workflow.includes(path),path);
  assert.doesNotMatch(workflow,/backend\/src\/|backend\/public\/index\.php/);
});

test("One Point Cup-Module bestehen Node-Syntaxprüfung",()=>{
  for(const path of ["site/assets/one-point.js","site/assets/one-point-ui.js",
    "site/assets/storage.js","site/assets/app.js"]){
    execFileSync(process.execPath,["--check",new URL("../"+path,import.meta.url).pathname]);
  }
});

test("Cup-Demo, zufällige Auslosung, Ein-Punkt-Ergebnis und Rücknahme bedienen sich im Browser",async()=>{
  const memory=new Map(),events={},notices=[],root={innerHTML:""};
  globalThis.localStorage={
    getItem(k){return memory.get(k)??null},
    setItem(k,v){memory.set(k,v)},
    removeItem(k){memory.delete(k)}
  };
  const dialog={innerHTML:"",replaceChildren(){},querySelector(){return {
    addEventListener(){},showModal(){},close(){}}
  }};
  globalThis.document={
    getElementById(id){return id==="app"?root:id==="dialog-root"?dialog:
      id==="toast-region"?{replaceChildren(item){notices.push(item.textContent)}}:null},
    addEventListener(name,fn){events[name]=fn},
    createElement(){return {className:"",textContent:"",setAttribute(){},remove(){}}}
  };
  globalThis.window={
    location:{hash:"",pathname:"/opc.html",search:""},
    addEventListener(){},setTimeout(){}
  };
  globalThis.history={replaceState(){}};
  globalThis.confirm=()=>true;
  await import("../site/assets/one-point-ui.js");
  const click=(act,extra={})=>events.click({target:{
    closest(){return {dataset:{act,...extra},matches(){return false}}}
  }});
  assert.match(root.innerHTML,/One Point Cup anlegen/);
  click("demo");
  assert.match(root.innerHTML,/Demo – One Point Cup/);
  let current=new BrowserTournamentStore().active();
  assert.equal(current.type,"opc");
  assert.equal(current.opc.players.length,16);
  click("tab",{tab:"bracket"});
  assert.match(root.innerHTML,/Spieler auslosen/);
  click("draw-generate");
  current=new BrowserTournamentStore().active();
  assert.ok(current.opc.draw);
  assert.match(root.innerHTML,/K.-o.-Tableau/);
  click("winner",{stage:"0",match:"0",slot:"1"});
  current=new BrowserTournamentStore().active();
  assert.equal(current.opc.draw.rounds[0][0].winner,current.opc.draw.rounds[0][0].left);
  click("winner-reset",{stage:"0",match:"0"});
  current=new BrowserTournamentStore().active();
  assert.equal(current.opc.draw.rounds[0][0].winner,null);
  click("draw-reset");
  current=new BrowserTournamentStore().active();
  assert.equal(current.opc.draw,null);
  assert.equal(current.opc.players.length,16);
  assert.ok(notices.some(v=>v.includes("Tableau zurückgenommen")));
});
