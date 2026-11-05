// TENNILO: Schleifchenturnier – regelgeprüfte Vorrunden-Auslosung.
// Quelle der Fachregeln: Google-Sheet "Turniere Verein – Auslosung & Livetabelle", Script (Schleifchen V7).
// Im ersten Schritt werden die NORMALEN Runden erzeugt. Eine nötige Auffüllrunde bleibt
// bis zur Eingabe aller regulären Ergebnisse offen (Auffüller mit 0/1 Schleifchen).
const MAX_ROUNDS = 20;
const pairKey = (a,b) => a < b ? a+"|"+b : b+"|"+a;
const stableHash = value => {
  let h = 0;
  for (const char of String(value)) h = ((h << 5) - h + char.charCodeAt(0)) | 0;
  return h;
};
const stableOrder = players => [...players].sort((a,b) =>
  (stableHash(a.name) - stableHash(b.name)) || a.name.localeCompare(b.name,"de") || a.id.localeCompare(b.id));
const makeRng = seed => {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
};
const shuffle = (a,rng) => {
  const out=[...a];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
};
const starts = t => ({
  strong: t.participants.filter(p=>p.present&&p.group==="stark"),
  weak: t.participants.filter(p=>p.present&&p.group==="schwaecher")
});
export function drawSignature(t) {
  const roster=t.participants.filter(p=>p.present).map(p=>[p.id,p.group]).sort((a,b)=>a[0].localeCompare(b[0]));
  return JSON.stringify({roster,courts:t.courts,rounds:Number(t.rounds)});
}
function validate(t) {
  if(!t||!Array.isArray(t.participants)||!Array.isArray(t.courts))throw Error("Turnierdaten fehlen.");
  if(![3,4].includes(Number(t.rounds)))throw Error("Für das Schleifchenturnier sind laut Vorlage 3 oder 4 Wertungsspiele je Spieler vorgesehen. Bitte die Einstellung anpassen.");
  if(!t.courts.length)throw Error("Bitte mindestens einen Platz einstellen.");
  const {strong,weak}=starts(t);
  if(strong.length<2||weak.length<2)throw Error("Es müssen mindestens zwei starke und zwei schwächere Spieler anwesend sein.");
  const ids=[...strong,...weak].map(p=>p.id);
  if(new Set(ids).size!==ids.length)throw Error("Teilnehmerkennungen sind nicht eindeutig.");
  if(ids.length>500)throw Error("Die aktuelle Testversion unterstützt maximal 500 anwesende Spieler.");
  const maxMatches=Math.min(t.courts.length,Math.floor(Math.min(strong.length,weak.length)/2));
  if(maxMatches<1)throw Error("Für diese Besetzung können keine Doppel gebildet werden.");
  return {strong,weak,maxMatches,target:Number(t.rounds)};
}
export function analyzeRibbonDraw(t) {
  const {strong,weak,maxMatches,target}=validate(t);
  // Pro Match stehen je 2 starke und 2 schwächere Personen auf dem Platz.
  const strongRegular=strong.length*target,weakRegular=weak.length*target;
  const perGroup=Math.ceil(Math.max(strongRegular,weakRegular)/2)*2;
  const fillerStrong=perGroup-strongRegular,fillerWeak=perGroup-weakRegular;
  let special=null;
  if(fillerStrong||fillerWeak){
    const matches=Math.max(1,Math.ceil(fillerStrong/2),Math.ceil(fillerWeak/2));
    const lastStrong=matches*2-fillerStrong,lastWeak=matches*2-fillerWeak;
    if(matches>t.courts.length||lastStrong<0||lastWeak<0||
       lastStrong>strong.length||lastWeak>weak.length||
       fillerStrong>strong.length-lastStrong||fillerWeak>weak.length-lastWeak){
      throw Error("Die Gruppen sind zu unterschiedlich groß oder es fehlen Plätze für eine einzige Auffüllrunde.");
    }
    special={
      matches,fillerStrong,fillerWeak,
      regularStrong:stableOrder(strong).slice(0,lastStrong).map(p=>p.id),
      regularWeak:stableOrder(weak).slice(0,lastWeak).map(p=>p.id)
    };
  }
  const quotas=Object.create(null);
  for(const p of [...strong,...weak])quotas[p.id]=target;
  if(special){
    for(const id of [...special.regularStrong,...special.regularWeak])quotas[id]=target-1;
  }
  const strongTotal=strong.reduce((s,p)=>s+quotas[p.id],0);
  const weakTotal=weak.reduce((s,p)=>s+quotas[p.id],0);
  if(strongTotal!==weakTotal||strongTotal%2!==0)throw Error("Intern: reguläre Spielkontingente passen nicht zusammen.");
  const remainingMatches=strongTotal/2;
  const lowerBound=Math.max(Math.max(...Object.values(quotas)),Math.ceil(remainingMatches/maxMatches));
  if(lowerBound+(special?1:0)>MAX_ROUNDS)throw Error("Für diese Einstellung sind mehr als 20 Runden erforderlich.");
  return {
    signature:drawSignature(t),strong:strong.length,weak:weak.length,target,
    maxMatches,quotas,special,
    expectedNormalMatches:remainingMatches,minimumNormalRounds:lowerBound,
    totalPhysicalMatches:perGroup/2
  };
}
function addHistory(match,counts,partners,opponents) {
  const [s1,w1,s2,w2]=match;
  for(const id of match)counts[id]++;
  for(const [a,b] of [[s1,w1],[s2,w2]])partners[pairKey(a,b)]=(partners[pairKey(a,b)]||0)+1;
  for(const [a,b] of [[s1,s2],[s1,w2],[w1,s2],[w1,w2]])opponents[pairKey(a,b)]=(opponents[pairKey(a,b)]||0)+1;
}
function matchPenalty(m,partners,opponents) {
  const [s1,w1,s2,w2]=m;
  return 1000*((partners[pairKey(s1,w1)]||0)+(partners[pairKey(s2,w2)]||0))+
    20*([[s1,s2],[s1,w2],[w1,s2],[w1,w2]].reduce((sum,[a,b])=>sum+(opponents[pairKey(a,b)]||0),0));
}
function buildRound(strong,weak,quotas,counts,partners,opponents,maxMatches,rng) {
  const availS=strong.filter(p=>counts[p.id]<quotas[p.id]);
  const availW=weak.filter(p=>counts[p.id]<quotas[p.id]);
  const remainingS=strong.reduce((sum,p)=>sum+quotas[p.id]-counts[p.id],0);
  const remainingW=weak.reduce((sum,p)=>sum+quotas[p.id]-counts[p.id],0);
  const n=Math.min(maxMatches,Math.floor(availS.length/2),Math.floor(availW.length/2),Math.floor(remainingS/2),Math.floor(remainingW/2));
  if(n<=0)return null;
  let best=null, bestScore=Infinity;
  for(let trial=0;trial<16;trial++){
    const byRemaining=people=>people.map(p=>({id:p.id,left:quotas[p.id]-counts[p.id],tie:rng()}))
      .sort((a,b)=>b.left-a.left||a.tie-b.tie).slice(0,n*2).map(p=>p.id);
    const s=shuffle(byRemaining(availS),rng), w=shuffle(byRemaining(availW),rng);
    const wPairs=[];for(let i=0;i<w.length;i+=2)wPairs.push([w[i],w[i+1]]);
    const perm=shuffle(wPairs,rng);
    const matches=[];let score=0;
    for(let i=0;i<n;i++){
      const s1=s[i*2],s2=s[i*2+1],[wa,wb]=perm[i];
      const optionA=[s1,wa,s2,wb],optionB=[s1,wb,s2,wa];
      const pa=matchPenalty(optionA,partners,opponents),pb=matchPenalty(optionB,partners,opponents);
      const chosen=pa<pb?optionA:pb<pa?optionB:rng()<.5?optionA:optionB;
      matches.push(chosen);score+=Math.min(pa,pb);
    }
    if(score<bestScore){best=matches;bestScore=score;if(score===0)break;}
  }
  return best;
}
export function generateRibbonDraw(t,options={}) {
  const spec=analyzeRibbonDraw(t);
  const {strong,weak}=starts(t),ids=[...strong,...weak].map(p=>p.id);
  const maxNormalRounds=MAX_ROUNDS-(spec.special?1:0);
  const fallbackSeed=(stableHash(spec.signature)^0x31b6d12e)>>>0;
  const baseSeed=Number.isSafeInteger(options.seed)?options.seed:fallbackSeed;
  // Verschiedene Platzierungen werden ausprobiert; nur vollständig gültige Pläne akzeptieren.
  for(let attempt=0;attempt<360;attempt++){
    const rng=makeRng(baseSeed+attempt*37);
    const counts=Object.fromEntries(ids.map(id=>[id,0]));
    const partners=Object.create(null),opponents=Object.create(null);
    const rounds=[];let failed=false;
    for(let r=0;r<maxNormalRounds;r++){
      if(ids.every(id=>counts[id]===spec.quotas[id]))break;
      const round=buildRound(strong,weak,spec.quotas,counts,partners,opponents,spec.maxMatches,rng);
      if(!round){failed=true;break;}
      for(const match of round)addHistory(match,counts,partners,opponents);
      const left=maxNormalRounds-r-1;
      const remainingGames=strong.reduce((s,p)=>s+spec.quotas[p.id]-counts[p.id],0)/2;
      if(ids.some(id=>counts[id]>spec.quotas[id]||spec.quotas[id]-counts[id]>left)||
        remainingGames>left*spec.maxMatches){failed=true;break;}
      rounds.push({number:r+1,matches:round.map((ids,i)=>({court:t.courts[i],slots:ids}))});
    }
    if(!failed&&ids.every(id=>counts[id]===spec.quotas[id])){
      const draw={
        engine:"ribbon-v7-normal-v1",signature:spec.signature,
        createdAt:new Date().toISOString(),target:spec.target,
        rounds,special:spec.special,status:spec.special?"auffuellrunde_offen":"normal_vollstaendig"
      };
      const result=verifyRibbonDraw(t,draw);
      if(result.ok)return draw;
    }
  }
  throw Error("Keine gültige Vorrunden-Auslosung gefunden. Bitte Teilnehmerzahl, Gruppen oder Platzanzahl prüfen.");
}
export function verifyRibbonDraw(t,draw) {
  const errors=[];
  let spec;
  try{spec=analyzeRibbonDraw(t);}catch(e){return {ok:false,errors:[e.message]};}
  if(draw?.signature!==spec.signature)errors.push("Teilnehmer, Spielzahl oder Plätze wurden seit der Auslosung verändert.");
  if(!Array.isArray(draw?.rounds))return {ok:false,errors:["Der gespeicherte Spielplan ist unvollständig."]};
  const {strong,weak}=starts(t);
  const sIds=new Set(strong.map(p=>p.id)),wIds=new Set(weak.map(p=>p.id));
  const counts=Object.fromEntries([...sIds,...wIds].map(id=>[id,0]));
  const courts=new Set(t.courts);
  for(let i=0;i<draw.rounds.length;i++){
    const round=draw.rounds[i];
    const used=new Set(),usedCourts=new Set();
    if(round.number!==i+1)errors.push(`Ungültige Rundennummer ${i+1}.`);
    if(!Array.isArray(round.matches)||round.matches.length>spec.maxMatches)errors.push(`Ungültige Spielanzahl in Runde ${i+1}.`);
    for(const match of round.matches||[]){
      const m=match.slots;
      if(!Array.isArray(m)||m.length!==4){errors.push("Ungültige Spielbegegnung.");continue;}
      if(!sIds.has(m[0])||!sIds.has(m[2])||!wIds.has(m[1])||!wIds.has(m[3]))errors.push(`Unpassende Stärkegruppen in Runde ${i+1}.`);
      for(const id of m){if(used.has(id))errors.push(`Spieler mehrfach in Runde ${i+1}.`);used.add(id);if(id in counts)counts[id]++;}
      if(!courts.has(match.court)||usedCourts.has(match.court))errors.push(`Ungültige Platzbelegung in Runde ${i+1}.`);
      usedCourts.add(match.court);
    }
  }
  for(const id of Object.keys(counts))if(counts[id]!==spec.quotas[id])errors.push(`Falsche reguläre Spielzahl für ${id}.`);
  if(draw.rounds.length+(spec.special?1:0)>MAX_ROUNDS)errors.push("Mehr als 20 Runden.");
  return {ok:errors.length===0,errors,counts,specialPending:!!spec.special};
}
