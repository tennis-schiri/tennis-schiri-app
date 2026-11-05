// TENNILO One Point Cup – erster Fachkern, noch keine Bedienoberfläche.
// Quelle: "Turniere Verein – Auslosung & Livetabelle", OPC-Spieler und One Point Cup.
// K.-o.-System: ein entscheidender Punkt je Begegnung, Sieger rückt weiter.
const validSize=n=>[2,4,8,16,32,64].includes(Number(n));
const seeded=seed=>{let x=(Number(seed)||1)>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};};
const shuffled=(items,seed)=>{const a=[...items],random=seeded(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const nameKey=name=>String(name??"").trim().toLocaleLowerCase("de-DE");

export function onePointSignature(t) {
  return JSON.stringify({
    kind:"one-point-v1",fieldSize:Number(t?.opc?.fieldSize),
    players:(t?.opc?.players||[]).map(p=>[p.id,p.name,!!p.present]).sort((a,b)=>a[0].localeCompare(b[0]))
  });
}
export function checkOnePointSetup(t) {
  const players=Array.isArray(t?.opc?.players)?t.opc.players:[];
  const present=players.filter(p=>p.present),size=Number(t?.opc?.fieldSize),errors=[];
  if(!validSize(size))errors.push("Bitte eine Feldgröße von 2, 4, 8, 16, 32 oder 64 wählen.");
  if(players.length>64)errors.push("Maximal 64 Spieler pro One Point Cup.");
  if(present.length<2)errors.push("Mindestens zwei anwesende Spieler erforderlich.");
  if(validSize(size)&&present.length>size)errors.push("Mehr anwesende Spieler als Plätze im Tableau.");
  if(validSize(size)&&present.length<=size/2)errors.push("Feldgröße reduzieren: Sonst hätten alle Spieler in Runde 1 ein Freilos.");
  if(players.some(p=>!p?.id||!String(p?.name||"").trim()))errors.push("Jeder Spieler braucht einen Namen.");
  if(new Set(players.map(p=>p.id)).size!==players.length)errors.push("Spieler-IDs müssen eindeutig sein.");
  if(new Set(players.map(p=>nameKey(p.name))).size!==players.length)errors.push("Spielernamen dürfen nicht doppelt vorkommen.");
  return {ok:errors.length===0,errors,selected:present.length,fieldSize:size,
    byes:validSize(size)?Math.max(0,size-present.length):0};
}
const winner=m=>m&&(m.winner===m.left||m.winner===m.right)?m.winner:null;
const sameTeams=(m,left,right)=>m&&m.left===left&&m.right===right;
const resolved=(left,right,old,allowBye=false)=>({
  left,right,
  winner:allowBye&&left&&!right?left:allowBye&&!left&&right?right:
    left&&right&&sameTeams(old,left,right)&&winner(old)?winner(old):null,
  bye:!!(allowBye&&((left&&!right)||(!left&&right)))
});
function rebuildRounds(first,previous=[]) {
  const rounds=[[...first]];
  let width=first.length;
  while(width>1) {
    const prev=rounds.at(-1),old=previous[rounds.length]||[];
    const current=[];
    for(let i=0;i<prev.length;i+=2){
      current.push(resolved(winner(prev[i]),winner(prev[i+1]),old[i/2]));
    }
    rounds.push(current);
    width=current.length;
  }
  return rounds;
}
export function drawOnePointCup(t,{seed=Date.now()}={}) {
  const info=checkOnePointSetup(t);
  if(!info.ok)throw Error(info.errors[0]);
  const ids=shuffled(t.opc.players.filter(p=>p.present).map(p=>p.id),seed);
  const half=info.fieldSize/2;
  const first=Array.from({length:half},(_,i)=>resolved(ids[i],ids[half+i]||null,null,true));
  return {format:"one-point-v1",signature:onePointSignature(t),seed:Number(seed)||1,
    rounds:rebuildRounds(first),createdAt:new Date().toISOString()};
}
export function checkOnePointDraw(t,draw=t?.opc?.draw) {
  const setup=checkOnePointSetup(t);
  if(!setup.ok)return {ok:false,errors:setup.errors};
  if(!draw||draw.format!=="one-point-v1"||draw.signature!==onePointSignature(t)||
    !Array.isArray(draw.rounds)||draw.rounds.length!==Math.log2(setup.fieldSize)) {
    return {ok:false,errors:["Das K.-o.-Tableau passt nicht mehr zur aktuellen Spielerliste."]};
  }
  const ids=new Set(t.opc.players.filter(p=>p.present).map(p=>p.id));
  const first=draw.rounds[0];
  if(!Array.isArray(first)||first.length!==setup.fieldSize/2)
    return {ok:false,errors:["Ungültige erste Runde."]};
  const seen=new Set();
  for(const m of first){
    if(!m||typeof m!=="object")return {ok:false,errors:["Ungültige Begegnung."]};
    if(!m.left||!ids.has(m.left)||m.right&&!ids.has(m.right)||m.left===m.right)
      return {ok:false,errors:["Ungültige Spielerbegegnung."]};
    if(!m.right&&m.winner!==m.left)
      return {ok:false,errors:["Das Freilos muss den vorhandenen Spieler weiterlassen."]};
    for(const id of [m.left,m.right].filter(Boolean)){
      if(seen.has(id))return {ok:false,errors:["Ein Spieler ist mehrfach ausgelost."]};
      seen.add(id);
    }
  }
  if(seen.size!==ids.size)return {ok:false,errors:["Nicht alle anwesenden Spieler ausgelost."]};
  let expected=rebuildRounds(first,draw.rounds);
  for(let level=0;level<draw.rounds.length;level++){
    const actual=draw.rounds[level],predicted=expected[level];
    if(!Array.isArray(actual)||actual.length!==predicted.length)
      return {ok:false,errors:["Die Rundengröße stimmt nicht."]};
    for(let i=0;i<actual.length;i++){
      const m=actual[i],p=predicted[i];
      if(!m||m.left!==p.left||m.right!==p.right||winner(m)!==winner(p)||
        m.winner!=null&&!winner(m))return {ok:false,errors:["Das Tableau enthält einen ungültigen Sieger oder eine veraltete Begegnung."]};
    }
  }
  return {ok:true,errors:[],rounds:draw.rounds.length,selected:ids.size};
}
export function setOnePointWinner(t,roundIndex,matchIndex,slot) {
  const check=checkOnePointDraw(t);
  if(!check.ok)throw Error(check.errors[0]);
  const rounds=t.opc.draw.rounds;
  if(!Number.isInteger(roundIndex)||roundIndex<0||roundIndex>=rounds.length||
    !Number.isInteger(matchIndex)||matchIndex<0||matchIndex>=rounds[roundIndex].length)
    throw Error("Begegnung nicht gefunden.");
  const match=rounds[roundIndex][matchIndex];
  if(!match.left||!match.right)throw Error("Diese Begegnung ist ein Freilos oder noch nicht vollständig.");
  if(slot!==null&&slot!==1&&slot!==2)throw Error("Bitte Spieler 1 oder 2 als Sieger wählen.");
  const replacement={...match,winner:slot===null?null:slot===1?match.left:match.right};
  const updated=rounds.map((level,i)=>i===roundIndex?level.map((m,j)=>j===matchIndex?replacement:m):level);
  const draw={...t.opc.draw,rounds:rebuildRounds(updated[0],updated)};
  const verification=checkOnePointDraw({...t,opc:{...t.opc,draw}},draw);
  if(!verification.ok)throw Error(verification.errors[0]);
  return draw;
}
export function onePointProgress(t) {
  const valid=checkOnePointDraw(t);
  if(!valid.ok)throw Error(valid.errors[0]);
  const stages=t.opc.draw.rounds.map((matches,index)=>({
    index,roundName:onePointRoundName(t.opc.fieldSize,index),
    matches,total:matches.length,
    decided:matches.filter(m=>winner(m)!=null).length
  }));
  const current=stages.find(x=>x.matches.some(m=>m.left&&m.right&&!winner(m)))?.index??stages.length-1;
  return {stages,current,champion:winner(t.opc.draw.rounds.at(-1)[0]),
    finished:!!winner(t.opc.draw.rounds.at(-1)[0])};
}
export function onePointRoundName(size,index) {
  const remaining=Number(size)/Math.pow(2,index+1);
  if(remaining===1)return "Finale";
  if(remaining===2)return "Halbfinale";
  if(remaining===4)return "Viertelfinale";
  if(remaining===8)return "Achtelfinale";
  if(remaining===16)return "Sechzehntelfinale";
  if(remaining===32)return "Zweiunddreißigstelfinale";
  return "Runde "+(index+1);
}
