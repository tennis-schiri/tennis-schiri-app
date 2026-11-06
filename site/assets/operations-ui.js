// Oberfläche für Bar-Nenngeld und die gespeicherte Rundenuhr.
// Die Berechnung liegt getrennt in operations.js.
import {entryDue,feesOverview,euroText,euroInput,plannedRound,clockFor} from "./operations.js?v=082";

export function renderFees(t,{icon,escapeHtml,stat}) {
  const a=feesOverview(t);
  const rows=a.players.map(p=>`<tr>
    <td><strong>${escapeHtml(p.name)}</strong><small>${p.present?" Anwesend":" Abwesend"}</small></td>
    <td>${euroText(p.due)}</td><td>${euroText(p.paid)}</td><td>${euroText(p.open)}</td>
    <td><span class="fee-status ${p.status}">${({
      frei:"Kostenfrei",offen:"Offen",teilweise:"Teilzahlung",bezahlt:"Bar bezahlt",überzahlung:"Überzahlung"
    })[p.status]}</span></td>
    <td><div class="fee-actions">
      ${p.open>0?`<button class="btn subtle small" data-action="fee-full" data-id="${escapeHtml(p.id)}">Rest bar erhalten</button>`:""}
      <button class="draw-edit-btn" data-action="fee-edit" data-id="${escapeHtml(p.id)}">${icon("edit")} Betrag korrigieren</button>
    </div></td>
  </tr>`).join("");
  return `<section class="screen">
    <div class="section-header"><div><div class="eyebrow">SCHLEIFCHENTURNIER / KASSE</div><h2>Nenngeld</h2>
      <p class="section-sub">Nur Barzahlung · manuelle Erfassung · keine Onlinezahlung</p></div>
      <button class="btn subtle" data-action="settings">${icon("edit")} Betrag ändern</button></div>
    <div class="draw-summary fees-stats">
      ${stat("JE SPIELER",euroText(t.entryFeeCents||0),"Standardbetrag")}
      ${stat("SOLL",euroText(a.expected),`${a.players.length} angemeldete Personen`)}
      ${stat("BAR ERHALTEN",euroText(a.received),`${a.paidCount} vollständig bezahlt`)}
      ${stat("OFFEN",euroText(a.open),`${a.openCount} mit offenem Betrag`)}
    </div>
    ${a.extra?`<div class="advice warn">${icon("alert")}<div><strong>Überzahlung prüfen</strong><span>${euroText(a.extra)} über dem Sollbetrag erfasst. Ggf. Korrektur oder Rückzahlung vor Ort.</span></div></div>`:""}
    <section class="panel fees-panel">
      <div class="panel-head"><div><h3>Bar-Kassenliste</h3>
      <p>Alle angemeldeten Personen, auch wenn sie als abwesend markiert sind.</p></div></div>
      <div class="draw-table-scroll"><table class="draw-ranking-table fees-table">
        <thead><tr><th>Spieler</th><th>Soll</th><th>Bar erhalten</th><th>Offen</th><th>Status</th><th>Erfassung</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="6">Noch keine Teilnehmenden vorhanden.</td></tr>'}</tbody>
      </table></div>
      <p class="draw-table-note">Individuelles Nenngeld unter „Teilnehmende“ beim Bearbeiten einstellen; 0,00 € ist beitragsfrei. Tatsächlich erfasste Barzahlungen bleiben bei späteren Tarifänderungen erhalten. Regelmäßig JSON-Sicherung erstellen.</p>
    </section>
  </section>`;
}
export function cashPaymentBody(t,p,{escapeHtml}) {
  return `<input type="hidden" name="playerId" value="${escapeHtml(p.id)}">
    <p class="section-sub">Fälliger Betrag: <strong>${euroText(entryDue(t,p))}</strong>. Nur tatsächlich bar erhaltene Beträge dokumentieren. 0,00 € setzt die Zahlung zurück.</p>
    <div class="form-grid"><label class="field wide">Insgesamt bar erhalten (€)
      <input name="cashPaid" inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" required
        value="${euroInput(p.feePaidCents||0)}"></label></div>`;
}
export function renderClockToolbar(t,index,{icon}) {
  const p=plannedRound(t,index),c=clockFor(t,index);
  const status={ready:"BEREIT",running:"LÄUFT",paused:"PAUSIERT",finished:"BEENDET"}[c.status];
  const real=c.startedAt?new Date(c.startedAt).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):null;
  const btn=(action,label,primary=false)=>`<button type="button" class="btn ${primary?"primary":"subtle"} small" data-action="round-clock" data-clock-action="${action}" data-round="${index}">${label}</button>`;
  return `<div class="round-timer-panel">
    <div class="round-timer-info">
      <div><span class="round-clock-eyebrow">${icon("clock")} RUNDENUHR · ${status}</span>
        <div class="round-countdown ${c.expired&&c.status==="running"?"is-overtime":""}" data-clock-value="${index}" role="timer">${c.display}</div></div>
      <div class="round-times"><strong>Plan: ${p.start}–${p.end} Uhr</strong>
        <span>${p.duration} Min. Spielzeit · ${p.breakMinutes} Min. Wechselpause bis ${p.pauseEnd}</span>
        ${real?`<span>Tatsächlich gestartet: ${real} Uhr</span>`:""}
        <span data-clock-note="${index}">${c.status==="running"?(c.expired?"Spielzeit abgelaufen – Uhr läuft weiter":"Uhr läuft"):
          c.status==="paused"?"Uhr pausiert":c.status==="finished"?"Runde beendet":"Noch nicht gestartet"}</span>
      </div>
    </div>
    <div class="round-timer-actions">
      ${c.status==="ready"?btn("start","Runde starten",true):""}
      ${c.status==="running"?btn("pause","Pausieren")+btn("finish","Runde beenden",true):""}
      ${c.status==="paused"?btn("resume","Fortsetzen",true)+btn("finish","Runde beenden"):""}
      ${c.status!=="ready"?btn("reset","Uhr zurücksetzen"):""}
    </div>
  </div>`;
}
export function refreshClockDisplays(t,doc,now=Date.now()) {
  if(!t||typeof doc.querySelectorAll!=="function")return;
  for(const el of doc.querySelectorAll("[data-clock-value]")){
    const index=Number(el.dataset.clockValue),c=clockFor(t,index,now);
    el.textContent=c.display;
    el.className=`round-countdown${c.expired&&c.status==="running"?" is-overtime":""}`;
    const note=typeof doc.querySelector==="function"?doc.querySelector(`[data-clock-note="${index}"]`):null;
    if(note&&c.status==="running")note.textContent=c.expired?"Spielzeit abgelaufen – Uhr läuft weiter":"Uhr läuft";
  }
}
