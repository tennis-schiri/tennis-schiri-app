import test from "node:test";
import assert from "node:assert/strict";
import {generateRibbonDraw} from "../site/assets/draw.js";
import {buildLiveDisplay} from "../site/assets/live-model.js";
import {
  createLiveSecrets,liveKeyValid,readLiveSecrets,saveLiveSecrets,clearLiveSecrets,
  remoteLiveUrl,publicLiveSnapshot,publishLive,fetchLive,remoteClockAt
} from "../site/assets/remote-live.js";

function fixture(){
  const t={id:"demo",name:"Clubturnier",date:"2026-11-05",startTime:"10:00",duration:20,
    breakMinutes:10,rounds:4,courts:[1,2,3,4],roundClocks:{},liveDisplay:null,
    finalSize:8,finalOptOut:[],entryFeeCents:1200,
    participants:[
      ...Array.from({length:8},(_,i)=>({id:"s"+i,name:"Stark "+i,group:"stark",
        present:true,feeTierId:"adults",feePaidCents:9999})),
      ...Array.from({length:8},(_,i)=>({id:"w"+i,name:"Schwächer "+i,group:"schwaecher",
        present:true,feePaidCents:700}))
    ]};
  t.draw=generateRibbonDraw(t,{seed:7});
  return t;
}
test("Zwei 192-Bit-Geheimnisse werden für Lesen und Schreiben erzeugt",()=>{
  let sequence=0;
  const crypto={getRandomValues(v){for(let i=0;i<v.length;i++)v[i]=(sequence+i)%256;sequence+=24;return v;}};
  const key=createLiveSecrets(crypto);
  assert.equal(key.channel.length,48);
  assert.equal(key.writer.length,48);
  assert.notEqual(key.channel,key.writer);
  assert.ok(liveKeyValid(key.channel));
  assert.throws(()=>createLiveSecrets(null),/HTTPS/);
  assert.equal(liveKeyValid("small"),false);
});
test("Geheimnis bleibt außerhalb des Turnier-JSON-Backups und ist löschbar",()=>{
  const d=new Map(),store={
    getItem(k){return d.get(k)||null},
    setItem(k,v){d.set(k,v)},
    removeItem(k){d.delete(k)}
  };
  const key={channel:"a".repeat(48),writer:"b".repeat(48)};
  saveLiveSecrets("turnier-id",key,store);
  assert.deepEqual(readLiveSecrets("turnier-id",store),key);
  assert.equal(readLiveSecrets("anderes-turnier",store),null);
  clearLiveSecrets("turnier-id",store);
  assert.equal(readLiveSecrets("turnier-id",store),null);
});
test("Zuschauer-Link enthält nur Leseschlüssel im Fragment, nie Schreibschlüssel",()=>{
  const key={channel:"a".repeat(48),writer:"b".repeat(48)};
  const url=remoteLiveUrl(key.channel,"https://app.tennis-schiri.de/index.html");
  assert.equal(url,`https://app.tennis-schiri.de/live.html#kanal=${key.channel}`);
  assert.doesNotMatch(url,/b{48}/);
});
test("Veröffentlichung enthält nur Sportdaten, keine Bar- oder Anwesenheitslisten",()=>{
  const t=fixture();
  const display=publicLiveSnapshot(t,1000000);
  const raw=JSON.stringify(display);
  assert.equal(display.mode,"round");
  assert.ok(display.matches?.length);
  assert.ok(display.ranking);
  for(const forbidden of ["feePaid","feeTier","entryFee","participants","present","9999","Nenngeld"])
    assert.doesNotMatch(raw,new RegExp(forbidden));
  assert.equal(display.id,undefined);
  assert.equal(display.now,undefined);
});
test("PHP-Publish und Stop senden nur an die geschützte API",async()=>{
  const key={channel:"a".repeat(48),writer:"b".repeat(48)};
  const calls=[];
  const request=async(url,opts)=>{
    calls.push({url,opts});
    return {ok:true,json:async()=>({ok:true})};
  };
  const display={mode:"waiting",message:"Start"};
  await publishLive(key,display,{request});
  assert.equal(calls[0].url,"./live-feed.php");
  assert.equal(calls[0].opts.method,"POST");
  assert.equal(calls[0].opts.credentials,"same-origin");
  assert.deepEqual(JSON.parse(calls[0].opts.body).display,display);
  await publishLive(key,null,{action:"stop",request});
  assert.equal(JSON.parse(calls[1].opts.body).action,"stop");
  assert.equal(JSON.parse(calls[1].opts.body).display,undefined);
});
test("Zuschauer liest mit Header statt mit Schlüssel in der URL",async()=>{
  const channel="a".repeat(48);
  const calls=[];
  const request=async(url,opts)=>{
    calls.push({url,opts});
    return {ok:true,json:async()=>({ok:true,display:{mode:"waiting"}})};
  };
  const result=await fetchLive(channel,{request});
  assert.equal(result.display.mode,"waiting");
  assert.equal(calls[0].url,"./live-feed.php");
  assert.equal(calls[0].opts.headers["X-Tennilo-Channel"],channel);
  assert.equal(calls[0].opts.credentials,"same-origin");
});
test("Ungültiger oder abgelaufener Link wird ausdrücklich als Fehler gemeldet",async()=>{
  const request=async()=>({ok:false,status:404,json:async()=>({ok:false,error:"Live-Link abgelaufen"})});
  await assert.rejects(fetchLive("a".repeat(48),{request}),e=>
    e.status===404&&e.message==="Live-Link abgelaufen");
});
test("Remote-Uhr zählt unabhängig vom absoluten Geräte-Datum korrekt weiter",()=>{
  const clock={status:"running",remainingMs:90000,overtimeMs:0};
  assert.equal(remoteClockAt(clock,0).display,"01:30");
  assert.equal(remoteClockAt(clock,30000).display,"01:00");
  assert.equal(remoteClockAt(clock,90000).display,"00:00");
  assert.equal(remoteClockAt(clock,91000).display,"+00:01");
  assert.equal(remoteClockAt({...clock,status:"paused"},500000).display,"01:30");
  assert.equal(remoteClockAt({status:"running",remainingMs:0,overtimeMs:3000},2000).display,"+00:05");
});
