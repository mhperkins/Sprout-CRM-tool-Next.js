// Recurring-event dates, shared by the CRM screens and Grant Metrics.
const todayISO = () => new Date().toISOString().slice(0, 10);

// Next occurrence of a recurring event on/after fromISO (default today). One-time → its event_date.
// Returns null if the series has ended (past `until`) or there's no anchor date.
export function nextOccurrence(ev, fromISO) {
  const r = ev.recurrence;
  if(!r || !r.frequency) return ev.event_date || null;
  if(r.frequency==="dates") {
    // Irregular series: the next listed date on/after fromISO.
    const from = fromISO || todayISO();
    const next = [...(r.dates||[])].sort().find(d => d >= from);
    return next && !(r.until && next > r.until) ? next : null;
  }
  const start = ev.event_date; if(!start) return null;
  const from = fromISO || todayISO();
  const fromEff = from < start ? start : from;   // never before the series start
  const parse = iso => new Date(iso+"T12:00:00");
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const until = r.until ? parse(r.until) : null;
  const base = parse(start);
  let occ;
  if(r.frequency==="daily") {
    occ = parse(fromEff);
  } else if(r.frequency==="weekly" || r.frequency==="biweekly") {
    const wd = (r.weekday!=null) ? r.weekday : base.getDay();
    occ = parse(fromEff); occ.setDate(occ.getDate() + ((wd - occ.getDay() + 7) % 7));
    if(r.frequency==="biweekly") {
      const first = parse(start); first.setDate(first.getDate() + ((wd - first.getDay() + 7) % 7));
      const days = Math.round((occ - first)/86400000);
      const rem = ((days % 14) + 14) % 14;
      if(rem!==0) occ.setDate(occ.getDate() + (14 - rem));
    }
  } else if(r.frequency==="monthly") {
    const dom = base.getDate(); const f = parse(fromEff);
    occ = new Date(f.getFullYear(), f.getMonth(), dom, 12);
    if(occ < f) occ = new Date(f.getFullYear(), f.getMonth()+1, dom, 12);
  } else { return ev.event_date || null; }
  if(until && occ > until) return null;
  return iso(occ);
}
// Every date (YYYY-MM-DD) an event lands on within [startISO,endISO] inclusive.
// One-time events return their date if it falls in range; recurring events expand every occurrence.
export function occurrencesInRange(ev, startISO, endISO) {
  const r = ev.recurrence;
  if(!r || !r.frequency) {
    const d = ev.event_date;
    return (d && d>=startISO && d<=endISO) ? [d] : [];
  }
  const out = [];
  let cursor = startISO;
  for(let i=0; i<400 && cursor<=endISO; i++) {
    const occ = nextOccurrence(ev, cursor);
    if(!occ || occ>endISO) break;
    if(occ>=startISO) out.push(occ);
    const d = new Date(occ+"T12:00:00"); d.setDate(d.getDate()+1);
    cursor = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  return out;
}

