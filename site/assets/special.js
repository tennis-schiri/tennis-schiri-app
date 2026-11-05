// TENNILO – separate Auffüllrunde nach Schleifchen-V7.
// Originalregel: Die normalen Resultate müssen vollständig vorliegen.
// Spieler mit bereits voller Spielquote dürfen nur mit 0/1 Schleifchen auffüllen;
// dieser zusätzliche Einsatz zählt für sie selbst nicht in der Wertung.
import { analyzeRibbonDraw, ribbonNormalResultsKey, ribbonStableHash, verifyRibbonDraw } from "./draw.js";
import { ribbonStandings } from "./results.js";

const key=(a,b)=>a<b?a+"|"+b:b+"|"+a;
const rngFromSeed=seed=>{
  let a=seed>>>0;
  return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
};
const shuffled=(values,rng)=>{
  const arr=[...values];
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
};
const add=(map,a,b)=>{const k=key(a,b);map[k]=(map[k]||0)+1;};
function history(draw){
  const partners=Object.create(null),opponents=Object.create(null);
  for(const round of draw.rounds)for(const match of round.matches){
    const [s1,w1,s2,w2]=match.slots;
    add(partners,s1,w1);add(partners,s2,w2);
    for(const [a,b] of [[s1,s2],[s1,w2],[w1,s2],[w1,w2]])add(opponents,a,b);
  }
  return {partners,opponents};
}
function penalty(slots,partners,opponents){
  const [s1,w1,s2,w2]=slots;
  return 1000*((partners[key(s1,w1)]||0)+(partners[key(s2,w2)]||0))+
    20*([[s1,s2],[s1,w2],[w1,s2],[w1,w2]]
      .reduce((sum,[a,b])=>sum+(opponents[key(a,b)]||0),0));
}
const byFillerPriority=(a,b)=>
  a.ribbons-b.ribbons||
  ribbonStableHash(a.name)-ribbonStableHash(b.name)||
  a.name.localeCompare(b.name,"de")||
  a.id.localeCompare(b.id);

export function generateRibbonSpecialRound(t,options={}) {
  const spec=analyzeRibbonDraw(t);
  if(!spec.special)throw Error("Für diese Teilnehmerzahl ist keine Auffüllrunde erforderlich.");
  if(!t?.draw)throw Error("Zuerst die normalen Runden auslosen.");
  if(t.draw.specialRound)throw Error("Die Auffüllrunde wurde bereits ausgelost.");
  const validation=verifyRibbonDraw(t,t.draw);
  if(!validation.ok)throw Error(validation.errors[0]||"Die Vorrunden-Auslosung ist ungültig.");

  const standings=ribbonStandings(t);
  if(!standings.complete)throw Error("Vor der Auffüllrunde müssen alle normalen Ergebnisse erfasst sein.");
  const strong=[...standings.eligible.strong].sort(byFillerPriority);
  const weak=[...standings.eligible.weak].sort(byFillerPriority);
  if(strong.length<spec.special.fillerStrong){
    throw Error(`Nicht genügend starke Auffüllspieler mit 0 oder 1 Schleifchen: benötigt ${spec.special.fillerStrong}, verfügbar ${strong.length}.`);
  }
  if(weak.length<spec.special.fillerWeak){
    throw Error(`Nicht genügend schwächere Auffüllspieler mit 0 oder 1 Schleifchen: benötigt ${spec.special.fillerWeak}, verfügbar ${weak.length}.`);
  }
  const strongSlots=[
    ...spec.special.regularStrong.map(id=>({id,filler:false})),
    ...strong.slice(0,spec.special.fillerStrong).map(p=>({id:p.id,filler:true}))
  ];
  const weakSlots=[
    ...spec.special.regularWeak.map(id=>({id,filler:false})),
    ...weak.slice(0,spec.special.fillerWeak).map(p=>({id:p.id,filler:true}))
  ];
  if(strongSlots.length!==spec.special.matches*2||weakSlots.length!==spec.special.matches*2)
    throw Error("Ungültige Besetzung der Auffüllrunde.");

  const {partners,opponents}=history(t.draw);
  const origin=ribbonNormalResultsKey(t.draw);
  const seed=Number.isSafeInteger(options.seed)?options.seed:
    ribbonStableHash(spec.signature+origin);
  const rng=rngFromSeed(seed);
  let best=null,lowest=Infinity;
  // Gleiche Gewichtung wie in der Google-Vorlage: alte Partnerschaften vermeiden,
  // Wiederholungen als Gegner weniger stark bestrafen.
  for(let trial=0;trial<450;trial++){
    const s=shuffled(strongSlots,rng),w=shuffled(weakSlots,rng);
    const weakPairs=[];for(let i=0;i<w.length;i+=2)weakPairs.push([w[i],w[i+1]]);
    const mixed=shuffled(weakPairs,rng);
    let score=0;const matches=[];
    for(let i=0;i<spec.special.matches;i++){
      const a=s[i*2],b=s[i*2+1],[c,d]=mixed[i];
      const combos=[[a,c,b,d],[a,d,b,c]];
      const penalties=combos.map(x=>penalty(x.map(p=>p.id),partners,opponents));
      const index=penalties[0]<penalties[1]?0:penalties[1]<penalties[0]?1:rng()<.5?0:1;
      const selected=combos[index];
      matches.push({
        court:t.courts[i],
        slots:selected.map(p=>p.id),
        fillerMask:selected.map(p=>p.filler)
      });
      score+=penalties[index];
    }
    if(score<lowest){best=matches;lowest=score;if(score===0)break;}
  }
  if(!best)throw Error("Auffüllrunde konnte nicht ausgelost werden.");
  const specialRound={
    number:t.draw.rounds.length+1,
    matches:best,
    normalResultsKey:origin
  };
  const next={...t.draw,specialRound,status:"auffuellrunde_ausgelost"};
  const checked=verifyRibbonDraw(t,next);
  if(!checked.ok)throw Error(checked.errors[0]||"Auffüllrunde konnte nicht validiert werden.");
  return next;
}

export function resetRibbonSpecialRound(t){
  if(!t?.draw?.specialRound)throw Error("Es ist keine Auffüllrunde vorhanden.");
  const {specialRound,...draw}=t.draw;
  return {...draw,status:"auffuellrunde_offen"};
}
