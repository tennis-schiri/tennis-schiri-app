import test from "node:test";
import assert from "node:assert/strict";
import {renderLiveScreen} from "../site/assets/live-ui.js";

const sample=()=>({
  mode:"round",name:"Winter & Frühjahr <Club>",date:"2026-11-05",startTime:"10:00",
  index:0,title:"Runde 1",subtitle:"Vorrunde",plannedStart:"10:00",plannedEnd:"10:20",
  timer:{display:"19:42",status:"running",expired:false},
  progress:1,total:2,ranking:[{place:1,name:"Alex",ribbons:2,played:3}],
  matches:[
    {number:1,court:"Center Court",batch:1,left:["Alex","Kim"],right:["Mika","Lea"],
      leftFillers:[false,false],rightFillers:[false,false],winner:1,score1:6,score2:3,finished:true},
    {number:2,court:"Platz 2",batch:1,left:["Sven","Tom"],right:["Pat","Chris"],
      leftFillers:[false,true],rightFillers:[false,false],winner:null,score1:null,score2:null,finished:false}
  ]
});
test("Großbildansicht enthält Spielplan, Ergebnis, Rundenuhr, Wertung, aber kein Nenngeld",()=>{
  const html=renderLiveScreen(sample());
  for(const text of ["Runde 1","19:42","Center Court","Alex","Kim","6","3","Schleifchen-Stand","AUFFÜLLER","1 von 2"])
    assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/Nenngeld|Barzahlung|data-action|form/);
});
test("Personen und Turniernamen werden sicher maskiert",()=>{
  const x=sample();
  x.name='<img src=x onerror="alert(1)">';
  x.matches[0].left[0]='<script>evil()</script>';
  const html=renderLiveScreen(x);
  assert.doesNotMatch(html,/<script>|<img/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;img/);
});
test("Kompakte nächste Runde wird gezeigt, die Livetabelle bleibt immer im Layout",()=>{
  const x=sample();
  x.matches=[...x.matches,...x.matches.map((m,i)=>({...m,number:i+3})),
    {...x.matches[0],number:5},{...x.matches[1],number:6}];
  x.nextRound={title:"Runde 2",plannedStart:"10:30",
    matches:[{court:"Platz 1",left:["Alex","Lea"],right:["Pat","Kim"]},
      {court:"Platz 2",left:["Sven","Mika"],right:["Chris","Tom"]}]};
  const html=renderLiveScreen(x);
  assert.match(html,/live-matches-dense/);
  assert.match(html,/Nächste Runde: Runde 2/);
  assert.match(html,/10:30 Uhr/);
  assert.match(html,/live-rankings/);
  assert.match(html,/Schleifchen-Stand/);
  assert.equal((html.match(/class="live-next-match"/g)||[]).length,2);
});

test("Nicht ausgeloste nächste Runde erzeugt keine Platzhalter oder leere Vorschau",()=>{
  const x=sample();
  x.nextRound=null;
  const html=renderLiveScreen(x);
  assert.doesNotMatch(html,/Nächste Runde:/);
  assert.match(html,/Schleifchen-Stand/);
});

test("Nächste Paarung escaped auch HTML-ähnliche Teamnamen",()=>{
  const x=sample();
  x.nextRound={title:'<img src=x onerror="x">',plannedStart:"10:30",
    matches:[{court:"Platz <5>",left:["<script>x</script>","Alex"],right:["Lea","Kim"]}]};
  const html=renderLiveScreen(x);
  assert.doesNotMatch(html,/<img|<script/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;img/);
});

test("Wartebild zeigt neutrale Hinweise und keinerlei alte Partien",()=>{
  const html=renderLiveScreen({mode:"waiting",message:"Noch keine Auslosung"});
  assert.match(html,/Warten auf die Auslosung/);
  assert.match(html,/Noch keine Auslosung/);
  assert.doesNotMatch(html,/live-match/);
});
test("Vollständiges Finale zeigt Turniersieger ohne weitere Bedienelemente",()=>{
  const x=sample();
  x.mode="finals";x.title="Finale";x.champion=["Alex","Kim"];x.stageIndex=1;x.stageCount=2;
  const html=renderLiveScreen(x);
  assert.match(html,/TURNIERSIEGER-DOPPEL/);
  assert.match(html,/Alex \+ Kim/);
  assert.match(html,/ENDRUNDE/);
});
test("Die Ergebnisanzeige unterscheidet erledigte und offene Partien",()=>{
  const html=renderLiveScreen(sample());
  assert.match(html,/SIEGER/);
  assert.match(html,/ERGEBNIS/);
  assert.match(html,/Spiel offen/);
});
