// Darstellung der Schleifchen-Endrunde. Fachlogik bleibt in finals.js.
import { ribbonFinalPreview, verifyRibbonFinals } from "./finals.js";
import { normalizeRibbonResult } from "./results.js";
import { plannedRound } from "./operations.js?v=082";

export function renderRibbonFinals(t,{icon,escapeHtml,courtName,groupLabel,editingFinal}){
  let preview=null,reason=null;
  try{preview=ribbonFinalPreview(t);}catch(e){reason=e.message;}
  const saved=t.draw?.finals||null;
  const check=saved?verifyRibbonFinals(t):null;
  const valid=check?.ok===true;
  const size=preview?.size??([8,16].includes(Number(t.finalSize))?Number(t.finalSize):8);
  const titleTeam=ids=>ids?ids.map(id=>escapeHtml(t.participants.find(p=>p.id===id)?.name||"Unbekannt")).join(" + "):"Sieger der vorherigen Begegnung";
  const chooser=`<section class="panel finals-options">
    <div class="panel-head"><div><h3>Endrunden-Größe</h3><p>8 oder 16 Einzelspieler bilden feste Doppel-Teams.</p></div></div>
    <div class="finals-options-inner">
      <div class="finals-size-control">
        <button type="button" class="btn ${size===8?"primary":"subtle"} small" data-action="final-size" data-size="8" ${saved?"disabled":""}>8 Spieler</button>
        <button type="button" class="btn ${size===16?"primary":"subtle"} small" data-action="final-size" data-size="16" ${saved?"disabled":""}>16 Spieler</button>
      </div>
      <p>Die besten spielbereiten Teilnehmer nach Schleifchen und Spielen qualifizieren sich. Wer abgewählt wird, macht Platz für den nächsten Nachrücker. Die Stärkegruppen werden erst bei der Doppel-Auslosung berücksichtigt.</p>
    </div>
  </section>`;
  const selection=preview?`<section class="panel finals-selection">
    <div class="panel-head"><div><h3>Qualifikation</h3>
      <p>${preview.eligible.length} / ${preview.size} qualifiziert · ${preview.reserves.length} Nachrücker</p></div>
      <span class="mini-tag">${preview.ready?"BEREIT":preview.complete?"TEILNAHME PRÜFEN":"VORRUNDE LÄUFT"}</span>
    </div>
    <div class="draw-table-scroll"><table class="draw-ranking-table">
      <thead><tr><th>Rang</th><th>Spieler</th><th>Gruppe</th><th>Schleifen</th><th>Endrunde?</th><th>Status</th></tr></thead>
      <tbody>${preview.rows.map(p=>`<tr class="${p.qualified?"finals-qualified":""}">
        <td>${p.rank}.</td><td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${groupLabel(p.group)}</td><td class="draw-ribbons">${p.ribbons}</td>
        <td><label class="finals-choose"><input type="checkbox" data-action="final-participation" data-id="${escapeHtml(p.id)}" ${p.wantsFinal?"checked":""} ${saved?"disabled":""} aria-label="${escapeHtml(p.name)} für die Endrunde zulassen"> Teilnehmen</label></td>
        <td>${!p.wantsFinal?'<span class="finals-status off">Abgewählt</span>':
          p.qualified?'<span class="finals-status qualified">✓ Qualifiziert</span>':
          `<span class="finals-status reserve">Nachrücker ${p.reserveRank}</span>`}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </section>`:"";
  const action=saved?`<div class="finals-draw-action">
    <button type="button" class="btn subtle" data-action="final-reset">${icon("arrowleft")} Endrunde zurücknehmen</button>
    <p class="finals-note">Alle Endrunden-Ergebnisse werden dabei gelöscht. Die Vorrunden bleiben erhalten.</p>
  </div>`:
    `<div class="finals-draw-action">
      ${reason||preview?.reason?
        `<div class="advice warn">${icon("info")}<div><strong>Endrunde noch nicht bereit</strong><span>${escapeHtml(reason||preview.reason)}</span></div></div>`:
        `<div class="advice good">${icon("check")}<div><strong>Endrunde ist bereit</strong><span>Die Doppelpartner werden einmalig ausgelost und bleiben bis zum Finale zusammen.</span></div></div>`}
      <button type="button" class="btn primary" data-action="final-generate" ${!preview?.ready?"disabled":""}>${icon("trophy")} Endrunde auslosen</button>
    </div>`;
  const invalid=saved&&!valid?`<div class="advice warn">${icon("alert")}<div>
    <strong>Gespeicherte Endrunde ist nicht gültig</strong>
    <span>${escapeHtml(check?.errors?.[0]||"Bitte Endrunde zurücknehmen und erneut auslosen.")}</span>
  </div></div>`:"";
  const finalTime=stageIndex=>{
    if(!t.reserveFinals)return "";
    try{
      const before=(t.draw?.rounds?.length||0)+(t.draw?.specialRound?1:0);
      const p=plannedRound(t,before+stageIndex);
      return " · Geplant "+escapeHtml(p.start)+"–"+escapeHtml(p.end)+" Uhr";
    }catch{return "";}
  };
  const bracket=valid?`<div class="finals-rounds">${saved.rounds.map((round,stageIndex)=>`
    <section class="panel finals-stage">
      <div class="panel-head"><div><h3>${round.label}</h3>
        <p>${round.matches.filter(m=>m.result?.winner===1||m.result?.winner===2).length} von ${round.matches.length} Ergebnissen erfasst${finalTime(stageIndex)}</p></div></div>
      <div class="finals-match-list">${round.matches.map((match,matchIndex)=>{
        const result=normalizeRibbonResult(match.result);
        const finished=result.winner!==null;
        const both=!!match.team1&&!!match.team2;
        const editing=editingFinal?.tournamentId===t.id&&editingFinal.stage===stageIndex&&editingFinal.match===matchIndex;
        return `<article class="finals-match">
          <div class="finals-match-meta">
            <span>${icon("court")} ${escapeHtml(courtName(t,match.court))}${match.batch>1?` · Spielblock ${match.batch}`:""}</span>
            <span>Begegnung ${matchIndex+1}</span>
          </div>
          <div class="finals-versus">
            <div class="finals-team ${finished?(result.winner===1?"is-winner":"is-loser"):""}">
              <span>TEAM 1 ${result.winner===1?'<strong class="finals-winner-label">✓ Sieger</strong>':""}</span>
              <strong>${titleTeam(match.team1)}</strong>
            </div>
            <div class="finals-score ${finished?"is-final":""}">${finished?
              result.score1!==null?`<strong>${result.score1} : ${result.score2}</strong>`:"✓ Sieg":"VS"}</div>
            <div class="finals-team ${finished?(result.winner===2?"is-winner":"is-loser"):""}">
              <span>TEAM 2 ${result.winner===2?'<strong class="finals-winner-label">✓ Sieger</strong>':""}</span>
              <strong>${titleTeam(match.team2)}</strong>
            </div>
          </div>
          ${!both?'<p class="finals-await">Die Sieger der vorherigen Runde werden automatisch übernommen.</p>':
            finished&&!editing?`<div class="finals-actions">
              <button class="draw-edit-btn" type="button" data-action="final-edit-result" data-stage="${stageIndex}" data-match="${matchIndex}">${icon("edit")} Ergebnis ändern</button>
            </div>`:""}
          ${both&&(!finished||editing)?`<form class="draw-result-form finals-score-form" data-form="final-result" data-stage="${stageIndex}" data-match="${matchIndex}">
            <label>Games Team 1<input name="score1" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="–" value="${result.score1??""}"></label>
            <label>Games Team 2<input name="score2" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="–" value="${result.score2??""}"></label>
            <label>Siegerteam<select name="winner">
              <option value="" ${result.winner===null?"selected":""}>Noch offen</option>
              <option value="1" ${result.winner===1?"selected":""}>Team 1</option>
              <option value="2" ${result.winner===2?"selected":""}>Team 2</option>
            </select></label>
            <div class="draw-result-actions">
              <button type="submit" class="btn subtle small">Ergebnis speichern</button>
              ${editing?'<button type="button" class="btn ghost small" data-action="final-cancel-edit">Abbrechen</button>':""}
            </div>
          </form>`:""}
        </article>`;
      }).join("")}</div>
    </section>`).join("")}</div>`:"";
  const champion=check?.complete&&check?.champion?
    `<section class="finals-champions"><div class="eyebrow">${icon("trophy")} TURNIERSIEGER</div>
       <h3>${titleTeam(check.champion)}</h3><p>Das Sieger-Doppel der Endrunde steht fest.</p></section>`:"";
  return `<section class="screen">
    <div class="section-header"><div><div class="eyebrow">SCHLEIFCHENTURNIER / ABSCHLUSS</div>
      <h2>Endrunde</h2><p class="section-sub">Qualifikation nach Schleifchen · feste Doppel bis zum Turniersieg</p></div></div>
    ${saved?`<div class="live-finals-choice"><button type="button" class="btn subtle" data-action="live-finals">${icon("monitor")} Endrunde auf Live-Monitor anzeigen</button></div>`:""}
    ${chooser}${selection}${invalid}${action}${champion}${bracket}
    <div class="browser-notice">${icon("info")}<div><strong>Endrunde in der Testversion</strong>
      <p>Die Gewinner rücken automatisch weiter. Endrundenspiele zählen nicht als neue Schleifchen-Wertung der Vorrunde. Noch keine Mehrgeräte-Synchronisierung oder Freigabe für echte Turniere.</p></div></div>
  </section>`;
}
