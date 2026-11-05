// Integriert den echten PHP-Endpunkt (Apache-Passwortschutz selbst ist
// nicht Teil dieses Tests). Das Deployment prüft PHP 8.2+ vor dem Upload.
import test from "node:test";
import assert from "node:assert/strict";
import {spawn,spawnSync} from "node:child_process";
import {createServer} from "node:net";

async function unusedPort(){
  const server=createServer();
  await new Promise((resolve,reject)=>server.once("error",reject).listen(0,"127.0.0.1",resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
async function ready(url,child){
  for(let tries=0;tries<50;tries++){
    if(child.exitCode!==null)throw Error("PHP-Server ist vorzeitig beendet.");
    try{const r=await fetch(url);if(r.status===400)return;}
    catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw Error("PHP-Testserver hat nicht rechtzeitig gestartet.");
}
test("PHP-Live-Dienst: Tokens, Trennung privater Felder, Veröffentlichung, Widerruf",async t=>{
  const check=spawnSync("php",["-v"],{encoding:"utf8"});
  if(check.status!==0)throw Error("PHP-CLI für den serverseitigen Live-Test fehlt.");
  const port=await unusedPort(),url=`http://127.0.0.1:${port}/live-feed.php`;
  const php=spawn("php",["-S",`127.0.0.1:${port}`,"-t","site"],{
    cwd:process.cwd(),stdio:["ignore","pipe","pipe"]
  });
  t.after(()=>{php.kill("SIGTERM");});
  await ready(url,php);
  const channel="a".repeat(47)+"3",writer="b".repeat(47)+"5";
  const wrong="c".repeat(48),query={mode:"round",name:"Club & Jugend",date:"2026-11-05",
    startTime:"10:00",title:"Runde 1",subtitle:"Vorrunde",index:0,progress:0,total:1,
    plannedStart:"10:00",plannedEnd:"10:20",participants:[{name:"NICHT ANZEIGEN"}],
    entryFeeCents:100000,feePaidCents:100000,
    matches:[{number:1,court:"Center",batch:1,left:["Alex","Kim"],right:["Lea","Tom"],
      leftFillers:[false,false],rightFillers:[false,false],
      winner:null,score1:null,score2:null,finished:false,feePaidCents:100000}],
    ranking:[{place:1,name:"Alex",ribbons:2,played:3}],
    timer:{status:"running",remainingMs:60000,overtimeMs:0,durationMs:1200000,
      display:"01:00",expired:false},
    champion:null};
  const post=(secret,action="publish",display=query)=>fetch(url,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({channel,writer:secret,action,display})
  });
  const get=(key=channel)=>fetch(url,{headers:{"X-Tennilo-Channel":key}});
  let response=await get("nope");
  assert.equal(response.status,400);
  response=await get();
  assert.equal(response.status,404);
  response=await post(writer);
  assert.equal(response.status,200,await response.text());
  response=await get();
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.ok,true);
  assert.equal(body.display.name,"Club & Jugend");
  assert.equal(body.display.matches[0].left[0],"Alex");
  assert.equal(body.display.timer.remainingMs,60000);
  assert.ok(Number.isInteger(body.savedAt)&&Number.isInteger(body.serverNow));
  assert.ok(!("writerHash" in body));
  const publicText=JSON.stringify(body);
  for(const privateField of ["participants","entryFeeCents","feePaidCents","NICHT ANZEIGEN"])
    assert.ok(!publicText.includes(privateField),privateField);
  response=await post(wrong);
  assert.equal(response.status,403);
  response=await post(writer,"stop");
  assert.equal(response.status,200);
  response=await get();
  assert.equal(response.status,404);
});
