// TENNILO v0.8.3 – erweiterbarer Turnierberater.
// Nur Vorplanung mit anonymen Modellteilnehmern: keine realen Spieler, Zahlungen
// oder veröffentlichten Zuschauer-Links werden verarbeitet oder erzeugt.
import {newTournament} from "./storage.js?v=082";
import {generateRibbonDraw} from "./draw.js?v=061";
import {doublesMatchOptions,generateDoublesDraw} from "./doubles.js?v=082";
import {onePointTimePlan} from "./one-point.js?v=082";
import {timeWindow,tournamentSchedule} from "./operations.js?v=082";

const courtsFor=n=>Array.from({length:n},(_,i)=>i+1);

export function normalizeAdvisorInput(raw) {
  const players=Number(raw.participants),courts=Number(raw.courtCount);
  if(!Number.isInteger(players)||players<4||players>128)
    throw Error("Bitte zwischen 4 und 128 Teilnehmende eingeben.");
  if(!Number.isInteger(courts)||courts<1||courts>24)
    throw Error("Bitte zwischen 1 und 24 Tennisplätze wählen.");
  const startTime=String(raw.startTime||"10:00");
  const endTime=String(raw.endTime||"")||null;
  const window=timeWindow({startTime,endTime});
  if(endTime&&window.minutes<15)
    throw Error("Zwischen Start und Ende müssen mindestens 15 Minuten liegen.");
  const goal=String(raw.goal||"many");
  const teamStyle=String(raw.teamStyle||"any");
  if(!["social","many","competitive","quick"].includes(goal))
    throw Error("Unbekanntes Turnierziel.");
  if(!["any","rotating","fixed","singles"].includes(teamStyle))
    throw Error("Unbekannter Partnerwunsch.");
  const date=String(raw.date||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw Error("Bitte ein gültiges Turnierdatum wählen.");
  const matchMode=String(raw.matchMode||"time");
  const pointTarget=Number(raw.pointTarget??7);
  if(!["time","points"].includes(matchMode)||!Number.isInteger(pointTarget)||pointTarget<1||pointTarget>99)
    throw Error("Bitte eine gültige Zählweise und ein Punktziel zwischen 1 und 99 wählen.");
  return {participants:players,courtCount:courts,date,startTime,endTime,
    goal,teamStyle,matchMode,pointTarget,pointWinByTwo:raw.pointWinByTwo===true,
    availableMinutes:window.minutes};
}

function scenario(input,type,extra={}) {
  return newTournament({type,name:"Vorplanung",date:input.date,
    startTime:input.startTime,endTime:input.endTime,
    timeMode:input.matchMode==="points"?"fixed":input.endTime?"fit":"fixed",
    matchMode:type==="opc"?"points":input.matchMode,
    pointTarget:type==="opc"?1:input.pointTarget,
    pointWinByTwo:type!=="opc"&&input.matchMode==="points"&&input.pointWinByTwo,
    courts:courtsFor(input.courtCount),duration:20,breakMinutes:5,
    rounds:4,entryFeeCents:0,...extra});
}
function ribbon(input) {
  if(input.participants>80)
    throw Error("Die belastbare Schleifchen-Probeauslosung ist im Berater derzeit auf 80 Personen begrenzt.");
  const strong=Math.floor(input.participants/2);
  const t=scenario(input,"ribbon",{reserveFinals:input.goal==="competitive"&&strong>=4});
  t.participants=Array.from({length:input.participants},(_,i)=>({
    id:"r"+i,name:"Person "+i,group:i<strong?"stark":"schwaecher",present:true
  }));
  let chosen=null,lastError=null;
  const choices=input.goal==="quick"?[3,4]:[4,3];
  for(const rounds of choices){
    try {
      const trial={...t,rounds};
      const draw=generateRibbonDraw(trial,{seed:37});
      const extra=draw.special?1:0;
      const reserved=t.reserveFinals?2:0;
      const plan=tournamentSchedule({...trial,draw},draw.rounds.length+extra+reserved);
      if(plan.overTarget){lastError=Error("Mit festen Spielzeiten wäre die Endzeit überschritten.");continue;}
      chosen={rounds,draw,plan,extra};break;
    }catch(error){lastError=error;}
  }
  if(!chosen)throw lastError||Error("Keine passende Schleifchen-Auslosung möglich.");
  const {rounds,draw,plan,extra}=chosen;
  const total=draw.rounds.reduce((n,r)=>n+r.matches.length,0)+(draw.special?.matches||0);
  return {settings:{rounds,duration:20,breakMinutes:5,reserveFinals:t.reserveFinals},
    blocks:plan.blocks,plannedEnd:plan.end,plannedMinutes:plan.plannedMinutes,
    matches:total,perPerson:rounds+" Spiele je Person",scoreGames:rounds,
    detail:draw.special?"Zusätzliche Auffüllrunde eingeplant.":"Starke und schwächere Gruppe werden modellhaft gleichmäßig verteilt.",
    note:"Vorplanung mit angenommener Spielstärkeverteilung; die tatsächliche Auslosung kann abweichen."};
}
function doubles(input) {
  if(input.participants%2)
    throw Error("Für feste Doppel müssen alle Teilnehmenden paarweise zu Teams zusammengestellt werden.");
  const teams=input.participants/2;
  if(teams>100)throw Error("Maximal 100 Doppel-Teams.");
  const t=scenario(input,"doubles",{reservePlayoffs:input.goal==="competitive"&&teams>=8});
  t.doubles.teams=Array.from({length:teams},(_,i)=>({
    id:"d"+i,player1:"Person "+(i*2+1),player2:"Person "+(i*2+2),present:true
  }));
  const options=doublesMatchOptions(t,{seed:37}).filter(o=>o.possible);
  if(!options.length)
    throw Error("Keine der 1–8 Begegnungszahlen passt zu Teams, Plätzen und Zeitfenster.");
  const preferred=input.goal==="quick"?2:input.goal==="many"?5:4;
  options.sort((a,b)=>(
    Math.abs(a.games-preferred)-Math.abs(b.games-preferred))||
    (b.games-a.games)
  );
  const selected=options[0];
  t.rounds=selected.games;
  const draw=generateDoublesDraw(t,{seed:37});
  const plan=tournamentSchedule({...t,doubles:{...t.doubles,draw}});
  return {settings:{rounds:selected.games,duration:20,breakMinutes:5,reservePlayoffs:t.reservePlayoffs},
    blocks:plan.blocks,plannedEnd:plan.end,plannedMinutes:plan.plannedMinutes,
    matches:selected.totalFixtures,perPerson:selected.games+" Spiele je Team",
    scoreGames:selected.games,teamCount:teams,
    detail:t.reservePlayoffs?"Top-8-Play-offs sind zeitlich berücksichtigt.":"Jedes Team erhält feste Partner und Gegner ohne Wiederholung.",
    note:"Modellrechnung mit "+teams+" vollständig gebildeten Teams; echte Anwesenheit und Teams noch eintragen."};
}
function onePoint(input) {
  if(input.participants>64)
    throw Error("Der One Point Cup unterstützt aktuell höchstens 64 Spieler.");
  const size=2**Math.ceil(Math.log2(input.participants));
  const t=scenario(input,"opc",{opcMinutes:3,duration:20,breakMinutes:0});
  t.opc={...t.opc,fieldSize:size,players:Array.from({length:input.participants},(_,i)=>({
    id:"o"+i,name:"Person "+i,present:true
  }))};
  const plan=onePointTimePlan(t);
  return {settings:{fieldSize:size,opcMinutes:3},
    blocks:plan.blocks,plannedEnd:plan.end,plannedMinutes:plan.plannedMinutes,
    matches:input.participants-1,
    perPerson:"Mindestens 1 Punktduell; Sieger bis "+Math.log2(size)+"",
    scoreGames:1,detail:input.participants===size?"K.-o.-System ohne Freilose.":
      (size-input.participants)+" Freilose im "+size+"er Feld berücksichtigt.",
    note:"Ein Punkt entscheidet jedes Match. Der Ablauf je K.-o.-Runde ist berücksichtigt; tatsächliche Wechsel können variieren."};
}

// Jede weitere Turnierart bekommt einen eigenen Adapter mit derselben
// Ergebnisstruktur. Bewertung, Darstellung und Anlegen können sie wiederverwenden.
export const FORMAT_ADVISORS=Object.freeze([
  {id:"ribbon",title:"Schleifchenturnier",
    description:"Wechselnde Doppelpartner, gemischte Spielstärken und viele Begegnungen.",
    teamStyle:"rotating",evaluate:ribbon},
  {id:"doubles",title:"Doppelturnier",
    description:"Feste Zweierteams, messbarer Leistungsvergleich und mögliche Play-offs.",
    teamStyle:"fixed",evaluate:doubles},
  {id:"opc",title:"One Point Cup",
    description:"Ein Punkt pro Begegnung, K.-o.-System und schneller Turnierabschluss.",
    teamStyle:"singles",evaluate:onePoint}
]);

const goalWeights={
  social:{ribbon:45,doubles:14,opc:0},
  many:{ribbon:33,doubles:40,opc:-30},
  competitive:{ribbon:14,doubles:43,opc:20},
  quick:{ribbon:0,doubles:6,opc:55}
};
function affinity(input,format) {
  const style= input.teamStyle==="any"?0:input.teamStyle===format.teamStyle?50:
    input.teamStyle==="rotating"&&format.id==="doubles"?-15:
    input.teamStyle==="fixed"&&format.id==="ribbon"?-30:
    input.teamStyle==="singles"&&format.id!=="opc"?-50:-20;
  return (goalWeights[input.goal][format.id]||0)+style;
}
function reasonFor(input,format) {
  const reasons=[];
  if(input.teamStyle!=="any"){
    if(input.teamStyle===format.teamStyle)
      reasons.push("Passt zur gewünschten Partner- bzw. Einzelspielweise.");
    else
      reasons.push("Abweichung beim Partnerwunsch: "+(format.id==="ribbon"?
        "Hier wechseln die Doppelpartner.":format.id==="doubles"?
        "Hier bleiben Zweierteams fest zusammen.":"Hier spielen alle einzeln im K.-o.-System."));
  }
  const goals={
    social:{ribbon:"Starker Fokus auf Abwechslung.",doubles:"Wettbewerb mit festen Partnern.",opc:"Kurzer Ausscheidungswettbewerb."},
    many:{ribbon:"Mehrere Begegnungen je Person.",doubles:"Mehrere Matches je festem Team.",opc:"Pro Ausscheiden nur ein Punktduell garantiert."},
    competitive:{ribbon:"Freundschaftlicher Wettbewerb mit Wertung.",doubles:"Tabellenwertung und mögliche Play-offs.",opc:"Direkte K.-o.-Entscheidung."},
    quick:{ribbon:"Wechselnde Partner brauchen mehrere Runden.",doubles:"Mehrere feste Doppelbegegnungen.",opc:"Wenige kurze Punkte bis zum Turniersieg."}
  };
  reasons.push(goals[input.goal][format.id]);
  return reasons.join(" ");
}
export function recommendTournamentFormats(raw) {
  const input=normalizeAdvisorInput(raw);
  const choices=FORMAT_ADVISORS.map(format=>{
    let estimate=null,reason=null;
    try {estimate=format.evaluate(input);}
    catch(error){reason=error?.message||"Unter diesen Bedingungen nicht sinnvoll planbar.";}
    const possible=!!estimate;
    return {id:format.id,title:format.title,description:format.description,
      feasible:possible,reason,estimate,why:reasonFor(input,format),score:possible?100+affinity(input,format):-1000};
  });
  choices.sort((a,b)=>(Number(b.feasible)-Number(a.feasible))||(b.score-a.score)||
    a.title.localeCompare(b.title,"de"));
  return choices.map((result,i)=>({...result,rank:result.feasible?
    choices.slice(0,i+1).filter(x=>x.feasible).length:null}));
}
export function advisorTournamentValues(raw,recommendation) {
  const input=normalizeAdvisorInput(raw);
  if(!recommendation?.feasible||
    !FORMAT_ADVISORS.some(format=>format.id===recommendation.id))
    throw Error("Bitte einen machbaren Turniervorschlag auswählen.");
  const e=recommendation.estimate,values={
    type:recommendation.id,
    name:"Vereinsturnier – "+recommendation.title,
    date:input.date,startTime:input.startTime,endTime:input.endTime,
    timeMode:input.matchMode==="points"?"fixed":input.endTime?"fit":"fixed",
    matchMode:recommendation.id==="opc"?"points":input.matchMode,
    pointTarget:recommendation.id==="opc"?1:input.pointTarget,
    pointWinByTwo:recommendation.id!=="opc"&&input.matchMode==="points"&&input.pointWinByTwo,
    courts:courtsFor(input.courtCount),
    duration:e.settings.duration||20,
    breakMinutes:e.settings.breakMinutes??5,
    rounds:e.settings.rounds||4,
    reserveFinals:e.settings.reserveFinals===true,
    reservePlayoffs:e.settings.reservePlayoffs===true,
    opcMinutes:e.settings.opcMinutes||3,
    entryFeeCents:0
  };
  if(recommendation.id==="opc")
    values.opc={players:[],fieldSize:e.settings.fieldSize,draw:null};
  return values;
}
