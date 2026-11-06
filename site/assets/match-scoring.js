// TENNILO: Wertungsart ist unabhängig von Turnierformat und Zeitplanung.
// "time" = bisherige Ergebnis-/Siegererfassung nach einer festen Dauer.
// "points" = Punktspiel bis zum Ziel, optional mit zwei Punkten Vorsprung.
// Der One Point Cup hat definitionsgemäß immer genau einen Entscheidungspunkt.
export function scoringRules(t={}) {
  if(t?.type==="opc")return {mode:"points",target:1,winByTwo:false,automaticWinner:true};
  const mode=t?.matchMode==="points"?"points":"time";
  const n=Number(t?.pointTarget);
  const target=Number.isInteger(n)&&n>=1&&n<=99?n:7;
  return {mode,target,winByTwo:mode==="points"&&t?.pointWinByTwo===true,
    automaticWinner:mode==="points"};
}
export function normalizePointResult(input,t) {
  if(input===null||input===undefined||input==="")return null;
  if(!input||typeof input!=="object"||Array.isArray(input))
    throw Error("Ungültiges Punktergebnis.");
  const empty=String(input.score1??"").trim()===""&&String(input.score2??"").trim()==="";
  if(empty&&String(input.winner??"").trim()==="")return null;
  const values=[input.score1,input.score2].map(value=>{
    const s=String(value??"").trim();
    if(!/^(0|[1-9]\d{0,2})$/.test(s))
      throw Error("Bitte für beide Teams die erzielten Punkte zwischen 0 und 999 eintragen.");
    return Number(s);
  });
  const [one,two]=values,{target,winByTwo}=scoringRules(t);
  const high=Math.max(one,two),low=Math.min(one,two);
  if(one===two)throw Error("Bei einem Punktspiel muss es einen Sieger geben.");
  if(high<target)throw Error("Das Punktziel von "+target+" wurde noch nicht erreicht.");
  if(winByTwo){
    if(high-low!==2||(high>target&&low<target-1))
      throw Error("Das Match endet erst mit "+target+" Punkten und zwei Punkten Vorsprung.");
  }else if(high!==target){
    throw Error("Ohne Zwei-Punkte-Vorsprung endet das Match bei genau "+target+" Punkten.");
  }
  const winner=one>two?1:2;
  if(String(input.winner??"").trim()!==""&&Number(input.winner)!==winner)
    throw Error("Der gewählte Sieger stimmt nicht mit den Punkten überein.");
  return {score1:one,score2:two,points1:null,points2:null,winner};
}
export function hasRecordedResults(t){
  const any=matches=>Array.isArray(matches)&&matches.some(m=>m?.result?.winner===1||m?.result?.winner===2);
  const rounds=rs=>Array.isArray(rs)&&rs.some(r=>any(r?.matches));
  return rounds(t?.draw?.rounds)||any(t?.draw?.specialRound?.matches)||
    rounds(t?.draw?.finals?.rounds)||rounds(t?.doubles?.draw?.rounds)||
    (t?.doubles?.playoffs&&["quarterfinals","semifinals","final","thirdPlace"]
      .some(k=>any(Array.isArray(t.doubles.playoffs[k])?t.doubles.playoffs[k]:
        t.doubles.playoffs[k]?[t.doubles.playoffs[k]]:[])))||false;
}
export function assertScoringChangeAllowed(previous,next){
  if(!previous||!hasRecordedResults(previous))return;
  const a=scoringRules(previous),b=scoringRules(next);
  if(a.mode!==b.mode||(a.mode==="points"&&(a.target!==b.target||a.winByTwo!==b.winByTwo)))
    throw Error("Bitte bestehende Ergebnisse erst zurücknehmen, bevor die Zählweise oder das Punktziel geändert wird.");
}
export function scoreModeFields(t={},escapeHtml=s=>String(s)){
  const {mode,target,winByTwo}=scoringRules(t);
  if(t?.type==="opc")return '<p>One Point Cup: ein entscheidender Punkt pro Match.</p>';
  return '<label class="field wide">Wie werden Matches gespielt?'+
    '<select name="matchMode">'+
      '<option value="time" '+(mode==="time"?"selected":"")+'>Auf Zeit – Sieger nach Ablauf erfassen</option>'+
      '<option value="points" '+(mode==="points"?"selected":"")+'>Auf Punkte – bis zum festgelegten Punktziel</option>'+
    '</select></label>'+
    '<label class="field">Punktziel (für Punktspiele)<input name="pointTarget" type="number" min="1" max="99" step="1" value="'+target+'" required></label>'+
    '<label class="field checkbox-field"><input type="checkbox" name="pointWinByTwo" '+(winByTwo?"checked":"")+'> Mit zwei Punkten Vorsprung gewinnen</label>'+
    '<div class="field wide"><span class="field-hint">Zeitspiele: Ergebnis und Sieger nach Ablauf eingeben. Punktspiele: erster Sieg beim festgelegten Ziel; Sieger wird aus den Punkten berechnet. Die Matchdauer ist bei Punktspielen nur ein Planungswert. Der One Point Cup bleibt ein Ein-Punkt-System.</span></div>';
}
export function readScoringFields(form) {
  const data=new FormData(form),mode=String(data.get("matchMode")||"time");
  if(!["time","points"].includes(mode))throw Error("Ungültige Match-Zählweise.");
  const target=Number(data.get("pointTarget"));
  if(!Number.isInteger(target)||target<1||target>99)
    throw Error("Das Punktziel muss zwischen 1 und 99 liegen.");
  return {matchMode:mode,pointTarget:target,pointWinByTwo:mode==="points"&&data.has("pointWinByTwo")};
}
