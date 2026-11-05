// TENNILO – reine (nicht interaktive) Großbildanzeige ohne Kassen-/Personenverwaltung.
export const escapeLiveText=value=>String(value??"").replace(/[&<>"']/g,ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[ch]);
const dateLabel=iso=>{
  const parts=String(iso??"").split("-");
  return parts.length===3?`${parts[2]}.${parts[1]}.${parts[0]}`:"";
};
function card(m){
  const team=(names,fillers,side)=>{
    const winning=m.winner===side,losing=m.finished&&!winning;
    const score=side===1?m.score1:m.score2;
    const people=names.map((p,i)=>`<span class="live-player">${escapeLiveText(p)}${fillers[i]?'<span class="live-filler">AUFFÜLLER</span>':""}</span>`).join('<span class="live-players-join">+</span>');
    return `<div class="live-team ${winning?"winner":losing?"loser":""}">
      <div><div class="live-team-label">TEAM ${side} ${winning?"· SIEGER":""}</div>${people}</div>
      <div class="live-team-score">${score!==null&&score!==undefined?score:""}</div>
    </div>`;
  };
  return `<article class="live-match ${m.finished?"done":""}">
    <div class="live-match-top"><span class="live-match-court">${escapeLiveText(m.court)}${m.batch>1?` · Block ${m.batch}`:""}</span>
      <span class="live-match-status">${m.finished?"ERGEBNIS":"BEGEGNUNG "+m.number}</span></div>
    <div class="live-teams">${team(m.left,m.leftFillers,1)}${team(m.right,m.rightFillers,2)}</div>
    <span class="live-side-label">${m.finished?"✓ Ergebnis erfasst":"● Spiel offen"}</span>
  </article>`;
}
export function renderLiveScreen(data) {
  if(!data||["missing","waiting","invalid"].includes(data.mode)){
    const title=data?.mode==="invalid"?"Spielplan prüfen":
      data?.mode==="waiting"?"Warten auf die Auslosung":"Turnier nicht gefunden";
    return `<section class="live-empty"><h1>${escapeLiveText(title)}</h1>
      <p>${escapeLiveText(data?.message||"Live-Daten noch nicht verfügbar.")}</p>
      <p>Die Turnierleitung steuert diese Anzeige im anderen Browserfenster.</p>
    </section>`;
  }
  const standings=data.ranking.length?`<aside class="live-rankings" aria-label="Schleifchen-Zwischenstand">
      <h3>Schleifchen-Stand</h3><p>Vorrunde · Top ${data.ranking.length}</p>
      ${data.ranking.map(p=>`<div class="live-standing-line"><span class="live-standing-rank">${p.place}.</span>
        <span class="live-standing-name">${escapeLiveText(p.name)}</span>
        <span class="live-standing-ribbons">${p.ribbons} ◉</span>
      </div>`).join("")}
    </aside>`:"";
  const timer=data.mode==="round"?`<div class="live-time-panel ${data.timer.expired&&data.timer.status==="running"?"overtime":""}">
    <div><span>RUNDENUHR</span><strong data-live-timer data-round-index="${data.index}">${escapeLiveText(data.timer.display)}</strong>
      <small data-live-status>${({
        ready:"NOCH NICHT GESTARTET",running:data.timer.expired?"ÜBERZEIT":"LÄUFT",
        paused:"PAUSIERT",finished:"BEENDET"
      })[data.timer.status]}</small></div></div>`:"";
  const champ=data.champion?.length?`<section class="live-champion"><span>🏆 TURNIERSIEGER-DOPPEL</span>
    <strong>${data.champion.map(escapeLiveText).join(" + ")}</strong></section>`:"";
  return `<section class="live-board">
    <div class="live-title-row"><div><div class="live-kicker">TENNILO · LIVE</div>
      <h1 class="live-event-name">${escapeLiveText(data.name)}</h1>
      <div class="live-event-date">${escapeLiveText(dateLabel(data.date))} · Beginn ${escapeLiveText(data.startTime)} Uhr</div></div>
      <div class="live-phase">${data.mode==="finals"?"ENDRUNDE":"VORRUNDE"}</div></div>
    <div class="live-stage-head"><div><h2>${escapeLiveText(data.title)}</h2>
      <p>${escapeLiveText(data.subtitle)}${data.mode==="round"?` · Geplant ${escapeLiveText(data.plannedStart)}–${escapeLiveText(data.plannedEnd)} Uhr`:""}</p>
      <div class="live-progress">${data.progress} von ${data.total} Begegnungen entschieden</div>
    </div>${timer}</div>
    ${champ}
    <div class="live-content">
      <section class="live-matches" aria-label="Aktuelle Begegnungen">${data.matches.map(card).join("")}</section>
      ${standings}
    </div>
  </section>`;
}
