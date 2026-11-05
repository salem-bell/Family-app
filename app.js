window.__booted = true;
/* =========================================================
   State
   ========================================================= */
function load(k){ try { return localStorage.getItem(k); } catch(_) { return null; } }
function save(k,v){ try { localStorage.setItem(k,v); } catch(_){} }
let KEY = load('dash-key') || '';
let lastMsg = '', data = null, lastErr = null, busy = {}, open = {}, editing = {}, expanded = {}, draft = null, evOpen = null, evEdit = null, feedMine = load('dash-feedmine') === '1';
let tab = load('dash-tab') || 'today', mineOnly = load('dash-mine') === '1', menuOpen = false, signInfo = null;
const isEditing = () => Object.keys(editing).length > 0 || !!draft;

/** The installed phone app (GitHub Pages) reaches the same script over HTTPS; the Google-served page uses google.script.run. */
async function post(fn, args){
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
  try {
    const res = await fetch(window.FAMILY_API, { method: 'POST', body: JSON.stringify({ fn, args }), signal: ctl.signal, redirect: 'follow' });   // text/plain: no CORS preflight
    const out = await res.json();
    if (out && out.error) throw new Error(out.error);
    return out.result;
  } catch (e) { if (e.name === 'AbortError') throw new Error('timeout'); if (e instanceof TypeError) throw new Error('offline'); throw e; }
  finally { clearTimeout(t); }
}
function call(p){
  if (window.FAMILY_API) return post('api', [KEY, p]);
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000));
  return Promise.race([timeout, new Promise((res, rej) => {
    if (window.google && google.script && google.script.run) google.script.run.withSuccessHandler(res).withFailureHandler(rej).api(KEY, p);
    else if (window.__mock) window.__mock(KEY, p).then(res, rej);
    else rej(new Error('offline'));
  })]);
}
/* Requests can come back out of order. Only the newest answer is shown, and a plain refresh never
   overwrites the screen while a change is still being saved (it could be from before the change). */
let seqStarted = 0, seqShown = 0, pendingActs = 0, lastActSeq = 0;
/** Calls a public server function (sign-in) – no key needed. */
function runFn(name, ...args){
  if (window.FAMILY_API) return post(name, args);
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 45000));
  return Promise.race([timeout, new Promise((res, rej) => {
    if (window.google && google.script && google.script.run) google.script.run.withSuccessHandler(res).withFailureHandler(rej)[name](...args);
    else if (window.__mockFn) window.__mockFn(name, args).then(res, rej);
    else rej(new Error('offline'));
  })]);
}
function loadSignInfo(){ if (signInfo) return; signInfo = { loading: true }; runFn('signInInfo').then(i => { signInfo = i || {}; render(); }, () => { signInfo = {}; render(); }); }
async function refresh(p){
  if (!KEY){ data = null; lastErr = 'nokey'; loadSignInfo(); render(); return; }
  const isAct = !!(p && p.action), seq = ++seqStarted;
  if (isAct){ pendingActs++; lastActSeq = seq; }
  let got = null, err = null;
  try { got = await call(p || {}); } catch (e) { err = e; }
  if (isAct) pendingActs--;
  const stale = seq < seqShown || (!isAct && pendingActs > 0) || (isAct && seq !== lastActSeq);
  if (stale && !err){ if (isAct && !pendingActs && seq === lastActSeq) refresh(); return; }
  if (err && isAct && pendingActs){ toast("Couldn't save: " + String(err && err.message || err).replace(/^(Error|Exception):\s*/, '')); return; }
  seqShown = seq;
  try {
    if (err) throw err;
    if (!got || !got.me || !got.order || !/^[23]$/.test(String(got.version || '').split('.')[0])){
      data = null; lastErr = 'mismatch'; lastMsg = 'Code.gs is ' + (got && got.version ? 'version ' + got.version : 'an older version') + ', but this page needs version 3.';
      render(); return;
    }
    data = got; lastErr = null; save('dash-cache', JSON.stringify(data));
    if (pendingGo){ const g = pendingGo; pendingGo = ''; setTimeout(() => goTo(g), 0); }
    pushCheck();
  }
  catch(e){
    const msg = String(e && e.message || e);
    if (/unauthorized|expired/.test(msg)){ KEY = ''; save('dash-key', ''); try { localStorage.removeItem('dash-cache'); } catch(_){} data = null; lastErr = /expired/.test(msg) ? 'expired' : 'badkey'; loadSignInfo(); }
    else {
      lastErr = e; lastMsg = msg.replace(/^(Error|Exception):\s*/, ''); toast(p && p.action ? "Couldn't save: " + lastMsg : /timeout/.test(msg) ? 'Google is taking too long.' : "Couldn't reach Google. Showing the last saved view.");
      if (isAct && data) setTimeout(() => { if (!pendingActs) refresh(); }, 300);   // undo the on-screen change: show what's really saved
    }
  }
  busy = {};
  try { render(); } catch (e) { data = null; lastErr = 'mismatch'; lastMsg = 'The page could not show this data: ' + (e && e.message || e); render(); }
}
const act = (action, params) => refresh(Object.assign({ action }, params));

/* =========================================================
   Helpers
   ========================================================= */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enc = s => encodeURIComponent(s);
const pad = n => String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const pd = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const plus = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const T = () => (data && data.today) || ymd(new Date());
const dayName = s => s === T() ? 'Today' : s === plus(T(), 1) ? 'Tomorrow' : pd(s).toLocaleDateString([], { weekday:'long', month:'short', day:'numeric' });
const short = s => pd(s).toLocaleDateString([], { month:'short', day:'numeric' });
const fmt = d => d.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }).replace(':00','').replace(/\s/g,'').toLowerCase();
const parseEv = (s, allDay) => allDay ? pd(s) : new Date(s);
const countdown = ms => { const m = Math.round(ms/60000); if (m <= 0) return 'now'; if (m < 60) return `in ${m} min`; const h = Math.floor(m/60); return h < 24 ? `in ${h}h${m%60 ? ' '+(m%60)+'m' : ''}` : `in ${Math.round(h/24)} days`; };
const inDays = n => n === null || n === undefined ? '' : n < 0 ? `${-n} day${n === -1 ? '' : 's'} late` : n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
const dueCls = n => n === null ? '' : n < 0 ? 'late' : n <= 7 ? 'soon' : '';
const money = v => v === null || v === undefined ? '—' : '$' + Number(v).toLocaleString([], { maximumFractionDigits: v % 1 ? 2 : 0 });
const telOf = s => (String(s).match(/[\d+][\d\s().-]{6,}\d/) || [''])[0].replace(/[^\d+]/g, '');
const on = f => !!(data && data.features && data.features[f]);
const ro = () => data && data.me && data.me.role === 'Viewer';
const multi = () => data && data.people && data.people.length > 1;
const colorOf = n => { const p = (data.people || []).find(x => x.name.toLowerCase() === String(n).toLowerCase()); return p && p.color ? p.color : 'var(--muted)'; };
const whoChip = n => n ? `<span class="who" style="background:${esc(colorOf(n))}">${esc(n)}</span>` : '';
const forChips = f => !f ? '' : /^both$/i.test(f) || /^everyone$/i.test(f) ? `<span class="tag">${esc(f)}</span>` : f.split(/,\s*/).map(whoChip).join('');
const mine = x => !multi() || !mineOnly || !x || /^(both|everyone)$/i.test(x) || x.split(/,\s*/).some(n => n.toLowerCase() === data.me.name.toLowerCase());
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', 3200); }
function copyText(t){
  const done = () => toast('Copied');
  const fb = () => { const a = document.createElement('textarea'); a.value = t; a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch(_) { toast('Copy failed'); } a.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
}
const card = (title, body, extra) => `<section class="card"><h2 class="lbl">${title}${extra !== undefined && extra !== '' ? `<span>${extra}</span>` : ''}</h2>${body}</section>`;
const empty = t => `<div class="empty">${t}</div>`;
const form = (kind, inner, attrs) => ro() ? '' : `<form class="add" data-form="${kind}" ${attrs || ''}>${inner}</form>`;
const forSelect = (sel) => multi() ? `<select name="for" aria-label="For"><option value="">Anyone</option><option ${sel === 'Both' ? 'selected' : ''}>Both</option>${data.people.map(p => `<option ${p.name === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : '';
const segMine = () => multi() ? `<div style="margin-bottom:14px"><span class="seg"><button data-mine="0" aria-pressed="${!mineOnly}">Everyone</button><button data-mine="1" aria-pressed="${mineOnly}">Just ${esc(data.me.name)}</button></span></div>` : '';

/* =========================================================
   Features ↔ tabs, and each person's view
   ========================================================= */
const TABNAME = { calendar:'Calendar', week:'Week', todos:'To-dos', shopping:'Shopping', meals:'Meals', routines:'Routines', upkeep:'Upkeep', bills:'Bills', budget:'Budget',
                  goals:'Goals', numbers:'Numbers', trips:'Trips', 'dates-out':'Date nights', dates:'Dates', notes:'Notes', links:'Links', followups:'Follow-ups', inventory:'Inventory',
                  chat:'Messages', directory:'Directory', gatherings:'Gatherings', polls:'Polls', recipes:'Recipes', market:'Marketplace', stories:'Stories' };
function enabledFeatures(){ return (data.order || []).filter(([f]) => on(f)).map(([f]) => f); }
function myFeatures(){
  const enabled = enabledFeatures(), v = data.view && data.view.features;
  if (!v) return enabled;
  const mineList = v.filter(f => enabled.indexOf(f) >= 0);
  if (enabled.indexOf('Messages') >= 0 && mineList.indexOf('Messages') < 0 && (data.view.seen || []).indexOf('Messages') < 0) mineList.unshift('Messages');   // new in v3: on for everyone until they untick it
  return mineList;   // features the organizer adds later stay off until the person ticks them
}
const tabOf = f => (data.order.find(x => x[0] === f) || [])[1];
const newFeatures = () => { const v = data.view && data.view.features; if (!v) return []; return enabledFeatures().filter(f => f !== 'Messages' && v.indexOf(f) < 0 && (data.view.seen || []).indexOf(f) < 0); };

/* =========================================================
   Counts (badges)
   ========================================================= */
function counts(){
  const t = T(), c = {};
  c.calendar = (data.events || []).filter(e => e.day === t && !e.done).length;
  c.chat = chatUnread();
  c.todos = ((data.tasks && data.tasks.open) || []).filter(x => mine(x.for)).length;
  c.followups = (data.followups || []).filter(f => f.due && f.due <= t).length;
  c.routines = (data.routines || []).filter(r => r.dueToday && !r.done && mine(r.who)).length;
  c.shopping = (data.shopping || []).filter(s => !s.got).length;
  c.inventory = (data.inventory || []).filter(i => i.onHand !== null && i.par !== null && i.onHand < i.par).length;
  c.dates = (data.dates || []).filter(d => d.days <= 7).length;
  c.upkeep = (data.upkeep || []).filter(u => u.days !== null && u.days <= 14).length;
  c.bills = (data.bills || []).filter(b => !b.paid && b.days !== null && b.days <= 7).length;
  c.budget = (data.budget || []).filter(b => b.status === 'over').length;
  c.gatherings = (data.gatherings || []).filter(g => g.days >= 0 && g.days <= 30 && !g.mine).length;
  c.polls = (data.polls || []).filter(p => p.open && !p.mine.length).length;
  c.market = (data.market || []).filter(m => m.status === 'Open' && m.from !== data.me.name && (!myRegion() || !m.region || m.region === myRegion())).length;
  const late = { bills: (data.bills || []).some(b => !b.paid && b.days < 0), upkeep: (data.upkeep || []).some(u => u.days < 0), budget: c.budget > 0, followups: (data.followups || []).some(f => f.due && f.due < t) };
  return { c, late };
}

/* =========================================================
   Rows
   ========================================================= */
function eventRow(e, now){
  const s = parseEv(e.start, e.allDay), en = parseEv(e.end, e.allDay), late = !e.done && !e.allDay && en < now;
  return `<div class="row ${e.done ? 'done' : ''}">
    <span class="sw" style="background:${esc(e.color || 'var(--accent)')}"></span>
    <button class="chk ${e.done ? 'on' : ''}" data-ev="${esc(e.id)}" data-done="${e.done ? 1 : 0}" aria-label="Mark done" ${busy[e.id] ? 'disabled style="opacity:.4"' : ''}>${e.done ? '✓' : ''}</button>
    <span class="time" style="${late ? 'color:var(--warn)' : ''}">${e.allDay ? 'All day' : fmt(s)}</span>
    <button class="txt evbtn" data-evopen="${esc(e.id)}" aria-expanded="${evOpen === e.id}">${esc(e.title)}${(e.who || []).map(whoChip).join('')}${e.location ? ` <span class="muted sm">· ${esc(e.location)}</span>` : ''}${e.series && e.series.repeats ? ' <span class="muted sm">↻</span>' : ''}</button></div>${evOpen === e.id ? eventDetail(e) : ''}`;
}
const gStamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function eventDetail(e){
  const c = data.cal || {};
  if (evEdit && evEdit.id === e.id) return `<div class="evd">${eventForm(e)}</div>`;
  const where = e.src === 'app' ? 'Dashboard calendar' : e.src === 'outside' ? esc(e.cal) + ' (outside calendar)' : esc(e.cal) + ' (Google)';
  const rep = e.series && e.series.repeats ? ` · repeats ${esc(e.series.repeats.toLowerCase())}${e.series.until ? ' until ' + esc(dayName(e.series.until)) : ''}` : '';
  const a = [];
  if (c.addButtons){
    const q = 't=' + enc(e.title) + '&s=' + enc(e.start) + '&e=' + enc(e.end) + '&a=' + (e.allDay ? 1 : 0) + (e.location ? '&l=' + enc(e.location) : '') + (e.notes ? '&n=' + enc(e.notes) : '');
    if (c.ics) a.push(`<a href="${esc(c.ics + '&' + q)}" target="_blank" rel="noopener">Apple / Outlook</a>`);
    const dates = e.allDay ? e.start.replace(/-/g, '') + '/' + e.end.replace(/-/g, '') : gStamp(new Date(e.start)) + '/' + gStamp(new Date(e.end));
    a.push(`<a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(e.title)}&dates=${dates}${e.location ? '&location=' + enc(e.location) : ''}${e.notes ? '&details=' + enc(e.notes) : ''}" target="_blank" rel="noopener">Google Calendar</a>`);
  }
  if (e.src === 'app' && !ro()) a.push(`<button data-evedit="${esc(e.id)}">Edit</button><button data-evdel="${esc(e.key)}" data-rep="${e.series && e.series.repeats ? 1 : 0}">Delete</button>`);
  return `<div class="evd"><div class="muted sm">${where}${rep}</div>${e.notes ? `<div style="margin-top:4px;white-space:pre-wrap">${esc(e.notes)}</div>` : ''}
    ${a.length ? `<div class="muted sm" style="margin-top:6px">${c.addButtons ? 'Save a copy to your calendar:' : ''}</div><div class="acts">${a.join('')}</div>` : ''}</div>`;
}
/** The add / edit event form. Repeats, who, where and notes only exist for dashboard (app) events. */
function eventForm(e){
  const c = data.cal || {}, app = !!e || c.addTo === 'app', s = (e && e.series) || {};
  const val = (x) => esc(x || '');
  const ppl = multi() ? `<select name="who" aria-label="Who"><option value="">Everyone</option>${(data.people || []).map(p => `<option ${s.who === p.name ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}${s.who && !(data.people || []).some(p => p.name === s.who) ? `<option selected>${esc(s.who)}</option>` : ''}</select>` : '';
  const more = app ? `<details ${e && (s.repeats || e.location || e.notes) ? 'open' : ''}><summary>Repeat, place, notes</summary><div class="evmore">
      <select name="repeats" aria-label="Repeats">${['', 'Daily', 'Weekdays', 'Weekly', 'Every 2 weeks', 'Monthly', 'Yearly'].map(r => `<option value="${r}" ${s.repeats === r ? 'selected' : ''}>${r || "Doesn't repeat"}</option>`).join('')}</select>
      <label class="muted sm" style="align-self:center">until</label><input name="until" type="date" value="${val(s.until)}" aria-label="Repeat until (optional)">
      <input name="where" placeholder="Where" maxlength="200" value="${val(e && e.location)}" aria-label="Where">
      <input name="notes" placeholder="Notes" maxlength="2000" value="${val(e && e.notes)}" aria-label="Notes"></div></details>` : '';
  const inner = `<input name="title" placeholder="What's happening?" maxlength="200" aria-label="Event title" style="flex:2 1 200px" value="${val(e && e.title)}">
    <input name="date" type="date" value="${val(e ? s.date : T())}" aria-label="Date"><input name="time" type="time" value="${val(s.time)}" aria-label="Start time"><span class="muted sm">to</span><input name="end" type="time" value="${val(s.end)}" aria-label="End time (optional)">
    ${ppl}${more}<button class="btn go">${e ? 'Save' : 'Add event'}</button>${e ? '<button type="button" class="btn" data-evcancel>Cancel</button>' : ''}`;
  return form('event', inner, e ? `data-edit="${esc(e.key)}" style="border-top:none;padding:6px 0"` : 'style="border-top:none"');
}
function subscribeCard(){
  const c = data.cal || {};
  if (c.needsUrl) return data.me.role === 'Organizer' ? card('On your phone or computer', `<div class="row"><span class="txt muted sm">To give everyone a calendar link, paste the app's web address into Settings › App web address (Apps Script › Deploy › Manage deployments).</span></div>`) : '';
  if (!c.feeds) return '';
  const link = feedMine && multi() ? c.feeds.mine : c.feeds.all;
  const pick = multi() ? `<div class="sub2"><button class="btn sm ${feedMine ? '' : 'go'}" data-feedmine="0">Everything</button><button class="btn sm ${feedMine ? 'go' : ''}" data-feedmine="1">Just mine + everyone's</button></div>` : '';
  return card('On your phone or computer', `<div class="row"><span class="txt">See dashboard events in your own calendar app. It's a private link for you – don't share it.</span></div>${pick}
    <div class="bar" style="border-top:none"><a class="btn go" href="${esc(link.replace(/^https:/, 'webcal:'))}" target="_top">Apple Calendar</a><button class="btn" data-copylink="${esc(link)}">Copy link for Google / Outlook</button></div>
    <div class="muted sm" style="padding:0 14px 12px;line-height:1.5"><b>Google Calendar</b> (computer): Other calendars › + › From URL › paste. <b>Outlook</b>: Add calendar › Subscribe from web › paste.<br>
    Read-only: change events here, not there. Updates show up in Apple Calendar within about an hour, Outlook within a few hours, Google within a day. Shows events added in the dashboard, not ${c.google ? 'Google or ' : ''}outside calendars (those are already in their own apps).</div>`);
}
const taskRow = t => `<div class="row ${busy[t.id] ? 'done' : ''}"><button class="chk ${busy[t.id] ? 'on' : ''}" data-task="${esc(t.id)}" aria-label="Mark done">${busy[t.id] ? '✓' : ''}</button><span class="txt">${esc(t.text)}${multi() ? forChips(t.for) : ''}</span></div>`;
const routineRow = r => `<div class="row ${r.done ? 'done' : ''}"><button class="chk ${r.done ? 'on' : ''}" data-routine="${esc(r.name)}" data-rwho="${esc(r.who)}" aria-label="Done">${r.done ? '✓' : ''}</button><span class="txt">${esc(r.name)}${forChips(r.who)}</span></div>`;
const linkRow = l => `<a class="row link" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="txt">${esc(l.name)}</span><span class="lbl">↗</span></a>`;
const billRow = b => `<div class="row" style="align-items:center"><span class="txt">${esc(b.bill)}${b.autopay ? '<span class="tag">Autopay</span>' : ''}<div class="muted sm">${b.paid ? 'Paid ' + short(b.lastPaid) : b.due ? 'Due ' + short(b.due) : esc(b.notes)}${b.amount !== null ? ' · ' + money(b.amount) : ''}</div></span>
    ${b.paid ? '<span class="due good">Paid</span>' : `<span class="due ${dueCls(b.days)}">${inDays(b.days)}</span>`}
    ${ro() || !b.due ? '' : `<button class="btn sm ${b.paid ? '' : 'go'}" data-bill="${b.row}" data-name="${esc(b.bill)}" data-undo="${b.paid ? 1 : 0}">${b.paid ? 'Undo' : 'Paid'}</button>`}</div>`;
const upkeepRow = u => `<div class="row" style="align-items:center"><span class="txt">${esc(u.item)}${u.category ? `<span class="tag">${esc(u.category)}</span>` : ''}<div class="muted sm">${u.last ? 'Last done ' + short(u.last) : 'Never logged'}${u.every ? ' · every ' + u.every + ' days' : ''}</div></span>
    <span class="due ${dueCls(u.days)}">${u.days === null ? 'set a date' : inDays(u.days)}</span>${ro() ? '' : `<button class="btn sm" data-upkeep="${u.row}" data-name="${esc(u.item)}">Done today</button>`}</div>`;
function budgetCard(b){
  const pct = b.pct === null ? 0 : Math.min(b.pct, 100), cls = b.status === 'over' ? 'late' : b.status === 'ahead' ? 'soon' : 'good';
  const label = { over:'Over budget', ahead:'Spending ahead of pace', 'on track':'On track', unknown:'No data yet' }[b.status];
  return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(b.name)}</span><span class="due ${cls}">${label}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%;${b.status === 'over' ? 'background:var(--warn)' : ''}"></div><div class="bar-mark" style="left:${b.monthPct}%" title="Where you'd be at an even pace"></div></div>
    <div class="muted sm" style="margin-top:4px">${b.show === 'dollars' && b.budget !== null ? `${money(b.spent)} of ${money(b.budget)} · ` : b.pct !== null ? b.pct + '% used · ' : ''}${b.daysLeft} days left</div></div>`;
}
function goalRow(g){
  const pct = g.target ? Math.min(Math.round(g.saved / g.target * 100), 100) : 0;
  return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(g.goal)}</span><span class="lbl">${pct}%</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
    <div class="muted sm" style="margin-top:4px">${money(g.saved)} of ${money(g.target)}${g.by ? ' · by ' + short(g.by) : ''}</div>
    ${ro() ? '' : `<form class="add" data-form="goal" data-row="${g.row}" data-name="${esc(g.goal)}" style="border:none;padding:8px 0 0"><input name="amount" inputmode="decimal" placeholder="Add an amount" aria-label="Amount" style="flex:1 1 120px"><button class="btn sm">Add</button></form>`}</div>`;
}
function spark(series){
  if (!series || series.length < 2) return '';
  const W = 320, H = 60, P = 4, vs = series.map(x => x[1]), lo = Math.min(...vs), hi = Math.max(...vs), r = hi - lo || 1;
  const X = i => P + i * (W - 2*P) / (series.length - 1), Y = v => H - P - (v - lo) / r * (H - 2*P);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="trend"><path d="${series.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(x[1]).toFixed(1)}`).join('')}" fill="none" stroke="var(--accent)" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>
    <div class="lbl muted" style="display:flex;justify-content:space-between"><span>${short(series[0][0])}</span><span>${short(series[series.length-1][0])}</span></div>`;
}
const delta = (v, then, dec) => { if (!then) return ''; const d = v - then[1], pct = then[1] ? d / then[1] * 100 : 0; return `<span class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : '–'} ${Math.abs(d).toFixed(dec)} (${Math.abs(pct).toFixed(1)}%)</span>`; };
const fmtNum = (n, v) => (n.unit === '$' ? '$' : '') + Number(v).toLocaleString([], { minimumFractionDigits: n.dec, maximumFractionDigits: n.dec }) + (n.unit && n.unit !== '$' ? ' ' + esc(n.unit) : '');

function fuRow(f){
  const t = T(), late = f.due && f.due < t, isOpen = !!open[f.id], ed = editing[f.id];
  const when = !f.due ? 'No date' : late ? 'Overdue · ' + short(f.due) : dayName(f.due);
  const head = `<button class="fuhead" data-toggle="${esc(f.id)}" aria-expanded="${isOpen}"><span class="lbl">${isOpen ? '▾' : '▸'}</span><b>${esc(f.who)}</b>${f.topic ? `<span class="muted">${esc(f.topic)}</span>` : ''}
      <span class="lbl ${late ? 'late' : ''}">${when} · ${esc(f.channel)}</span>${f.note ? '<span class="flag">NOTE</span>' : ''}</button>`;
  if (!isOpen) return `<div class="row fu" style="display:block">${head}</div>`;
  let body;
  if (ed){
    body = `${f.channel === 'Email' ? `<label class="f">To</label><input class="f-in" data-ef="to" data-id="${esc(f.id)}" value="${esc(ed.to)}" autocapitalize="off"><label class="f">Subject</label><input class="f-in" data-ef="subject" data-id="${esc(f.id)}" value="${esc(ed.subject)}">` : ''}
      <label class="f">Message</label><textarea class="f-in" data-ef="message" data-id="${esc(f.id)}">${esc(ed.message)}</textarea>
      <div class="acts"><button class="go" data-save="${esc(f.id)}">Save</button><button data-cancel="${esc(f.id)}">Cancel</button></div>`;
  } else {
    const tel = telOf(f.phone), a = [];
    if (f.channel === 'Email' && f.to){ a.push(`<a class="go" href="mailto:${esc(f.to)}?subject=${enc(f.subject)}&body=${enc(f.message)}" target="_top">Email</a>`, `<a href="https://mail.google.com/mail/?view=cm&fs=1&to=${enc(f.to)}&su=${enc(f.subject)}&body=${enc(f.message)}" target="_blank" rel="noopener">Gmail</a>`); }
    if (f.channel === 'Text' && tel) a.push(`<a class="go" href="sms:${tel}&body=${enc(f.message)}" target="_top">Text</a>`);
    if (tel) a.push(`<a href="tel:${tel}" target="_top">Call</a>`);
    a.push(`<button data-copy="${esc(f.id)}">Copy text</button>`);
    if (!ro()) a.push(`<button data-edit="${esc(f.id)}">Edit</button>`, `<button data-fu="${esc(f.id)}" data-st="sent">Done ✓</button>`, `<button data-fu="${esc(f.id)}" data-st="skip">Skip</button>`);
    body = `${f.note ? `<div class="warn">${esc(f.note)}</div>` : ''}<div class="msg">${f.channel === 'Email' ? `<span class="lbl muted">To ${esc(f.to || '—')}</span>\n` : ''}${f.subject ? '<b>' + esc(f.subject) + '</b>\n\n' : ''}${esc(f.message)}</div><div class="acts">${a.join('')}</div>`;
  }
  return `<div class="row fu" style="display:block${busy[f.id] ? ';opacity:.45' : ''}">${head}<div class="body">${body}</div></div>`;
}

/* =========================================================
   Today cards, one per feature (only if it has something to say)
   ========================================================= */
const TODAY = {
  'Messages': () => { const u = (data.channels || []).filter(x => x.unread); return u.length ? card('New messages', u.slice(0, 4).map(x => `<button class="crow unread" data-openchat="${esc(x.id)}">${avatar(x, 36)}<span class="cbody"><span class="ctop"><b>${esc(x.name)}</b><span class="cwhen">${x.last ? shortWhen(x.last.at) : ''}</span></span><span class="cbot"><span class="cpre">${x.last ? (x.kind === 'dm' ? '' : esc(first(x.last.from)) + ': ') + esc(x.last.text) : ''}</span><span class="cn">${x.unread}</span></span></span></button>`).join(''), `<button class="btn sm" data-tab="chat">All</button>`) : ''; },
  'Calendar': now => { const ev = (data.events || []).filter(e => e.day === T()); return card('Today', ev.length ? ev.map(e => eventRow(e, now)).join('') : empty('Nothing on the calendar.'), ro() ? '' : `<button class="btn sm" data-go="calendar">+ Event</button>`); },
  'Week ahead': () => { const n = (data.events || []).filter(e => e.day > T() && e.day <= plus(T(), 7)).length; return n ? card('This week', `<div class="row"><span class="txt">${n} event${n > 1 ? 's' : ''} in the next 7 days</span><button class="btn sm" data-go="week">See the week</button></div>`) : ''; },
  'To-dos': () => {
    const o = data.tasks.open.filter(x => mine(x.for));
    const body = data.lists.map(l => { const all = o.filter(x => x.list === l), shown = expanded[l] ? all : all.slice(0, 3);
      return `<div class="sub lbl">${esc(l)} · ${all.length}</div>${shown.length ? shown.map(taskRow).join('') : empty('All clear.')}${all.length > 3 ? `<div class="more"><button data-expand="${esc(l)}">${expanded[l] ? 'Show fewer' : '+' + (all.length - 3) + ' more'}</button></div>` : ''}`; }).join('');
    return card('To-dos', body + taskForm(''));
  },
  'Shopping list': () => { const need = (data.shopping || []).filter(s => !s.got); return card('Shopping list', (need.length ? need.slice(0, 5).map(s => `<div class="row"><span class="txt">${esc(s.item)}${s.qty ? ` <span class="pill">${esc(s.qty)}</span>` : ''}${s.store ? ` <span class="muted sm">· ${esc(s.store)}</span>` : ''}</span></div>`).join('') + (need.length > 5 ? `<div class="more"><button data-go="shopping">+${need.length - 5} more</button></div>` : '') : empty('Nothing needed.')) + shopForm(), need.length); },
  'Meal plan': () => { const m = (data.meals || []).filter(x => x.date === T()); return card("Today's meals", m.length ? m.map(mealRow).join('') : empty('Nothing planned yet.'), `<button class="btn sm" data-go="meals">Week</button>`); },
  'Routines & chores': () => { const d = (data.routines || []).filter(r => r.dueToday && mine(r.who)); return d.length ? card('Routines', d.map(routineRow).join('')) : ''; },
  'Home & car upkeep': () => { const d = (data.upkeep || []).filter(u => u.days !== null && u.days <= 14); return d.length ? card('Upkeep due', d.map(upkeepRow).join('')) : ''; },
  'Bills & renewals': () => { const d = (data.bills || []).filter(b => !b.paid && b.days !== null && b.days <= 7); return d.length ? card('Bills due', d.map(billRow).join('')) : ''; },
  'Budget snapshot': () => (data.budget || []).length ? card('Budget', data.budget.map(budgetCard).join('')) : '',
  'Savings goals': () => '',
  'Numbers': () => { const ns = (data.numbers || []).filter(n => n.latest); return ns.length ? card('Numbers', ns.map(n => `<div class="row"><span class="txt">${esc(n.name)}</span><span class="lbl"><b>${fmtNum(n, n.latest[1])}</b> ${delta(n.latest[1], n.prev, n.dec)}</span></div>`).join('')) : ''; },
  'Trips': () => { const t = (data.trips || []).find(x => x.days !== null && x.days >= 0 && x.days <= 60); return t ? card('Next trip', `<div class="row"><span class="txt"><b>${esc(t.trip)}</b>${t.where ? ` · ${esc(t.where)}` : ''}<div class="muted sm">${short(t.start)}${t.end !== t.start ? ' – ' + short(t.end) : ''} · ${t.items.filter(i => !i.done).length} to do</div></span><span class="due ${t.days <= 7 ? 'soon' : ''}">${inDays(t.days)}</span></div>`, `<button class="btn sm" data-go="trips">Open</button>`) : ''; },
  'Date nights': () => { const d = data.dateNights; if (!d) return ''; return card('Date night', d.next ? `<div class="row"><span class="txt">${esc(d.next.title)}</span><span class="due">${d.next.allDay ? dayName(d.next.start) : countdown(new Date(d.next.start) - new Date())}</span></div>` : `<div class="row"><span class="txt">Nothing booked.${d.turn ? ` ${whoChip(d.turn)}'s turn to plan.` : ''}</span><button class="btn sm" data-go="dates-out">Ideas</button></div>`); },
  'Important dates': () => { const s = (data.dates || []).filter(d => d.days <= 14); return s.length ? card('Coming up', s.map(d => `<div class="row"><span class="txt">${esc(d.name)}${d.years ? ` <span class="muted">(${d.years})</span>` : ''}</span><span class="due">${inDays(d.days)}</span></div>`).join('')) : ''; },
  'Notes board': () => { const p = (data.notes || []).filter(n => n.pin).slice(0, 3); return p.length ? card('Pinned notes', p.map(n => `<div class="row"><span class="txt">${esc(n.text)} <span class="muted sm">— ${esc(n.from)}</span></span></div>`).join(''), `<button class="btn sm" data-go="notes">All</button>`) : ''; },
  'Gatherings': () => { const g = (data.gatherings || []).filter(x => x.days >= 0 && x.days <= 30).slice(0, 3); return g.length ? card('Gatherings', g.map(x => `<div class="row"><span class="txt"><b>${esc(x.title)}</b><div class="muted sm">${gWhen(x)}${x.headcount ? ' · ' + x.headcount + ' coming' : ''}</div></span>${x.mine ? `<span class="tag">${esc(x.mine.answer)}</span>` : ro() ? '' : `<button class="btn sm go" data-go="gatherings">RSVP</button>`}</div>`).join(''), `<button class="btn sm" data-go="gatherings">All</button>`) : ''; },
  'Polls': () => { const p = (data.polls || []).filter(x => x.open && !x.mine.length); return p.length && !ro() ? card('Your vote is needed', p.slice(0, 3).map(x => `<div class="row"><span class="txt">${esc(x.question)}<div class="muted sm">${x.voters} voted${x.closes ? ' · closes ' + inDays(daysTo(x.closes)) : ''}</div></span><button class="btn sm go" data-go="polls">Vote</button></div>`).join('')) : ''; },
  'Marketplace': () => { const m = (data.market || []).filter(x => x.status === 'Open' && x.from !== data.me.name && (!myRegion() || !x.region || x.region === myRegion())).slice(0, 3); return m.length ? card('Marketplace' + (myRegion() ? ' · ' + esc(myRegion()) : ''), m.map(x => `<div class="row"><span class="txt"><span class="tag ${x.type === 'Need help' ? 'help' : 'give'}">${x.type === 'Need help' ? 'Needs help' : 'Free'}</span> ${esc(x.what)}<div class="muted sm">${esc(x.from)}${x.region ? ' · ' + esc(x.region) : ''}</div></span></div>`).join(''), `<button class="btn sm" data-go="market">All</button>`) : ''; },
  'Stories': () => { const st = (data.stories || [])[0]; return st ? card('Latest story', `<div class="row" style="display:block"><b>${esc(st.title)}</b><div class="muted sm">${esc(st.from)}${st.when ? ' · ' + esc(st.when) : ''}</div><div style="margin-top:4px">${esc(st.story.slice(0, 160))}${st.story.length > 160 ? '…' : ''}</div></div>`, `<button class="btn sm" data-go="stories">Read</button>`) : ''; },
  'Links': () => { const p = (data.links || []).filter(l => l.pin); return p.length ? card('Pinned links', p.map(linkRow).join('')) : ''; },
  'Follow-ups': () => { const d = (data.followups || []).filter(f => f.due && f.due <= T()); return d.length ? card('Follow-ups due', d.map(f => `<div class="row"><span class="txt">${esc(f.who)} <span class="lbl ${f.due < T() ? 'late' : ''}">· ${f.due < T() ? 'Overdue' : 'Today'}</span></span></div>`).join('') + `<div class="bar"><button class="btn" data-go="followups">Open follow-ups</button></div>`, d.length) : ''; },
  'Inventory alerts': () => { const l = (data.inventory || []).filter(i => i.onHand !== null && i.par !== null && i.onHand < i.par); return l.length ? card('Running low', l.map(i => `<div class="row"><span class="txt">${esc(i.item)}</span><span class="due late">${i.onHand} / ${i.par} ${esc(i.unit)}</span></div>`).join(''), l.length) : ''; },
};
const mealRow = x => `<div class="row"><span class="time">${esc(x.meal)}</span><span class="txt">${esc(x.what)}${x.cook ? whoChip(x.cook) : ''}</span></div>`;
const taskForm = list => form('task', `${list ? '' : `<select name="list" aria-label="List">${data.lists.map(l => `<option>${esc(l)}</option>`).join('')}</select>`}<input name="text" placeholder="Add a to-do" maxlength="300" aria-label="New to-do">${forSelect(mineOnly ? data.me.name : '')}<button class="btn go">Add</button>`, `data-list="${esc(list)}"`);
const stores = () => [...new Set((data.shopping || []).map(s => s.store).filter(Boolean))];
const shopForm = () => form('shop', `<input name="item" placeholder="Add an item" maxlength="120" aria-label="Item"><input name="qty" placeholder="Qty" style="width:64px;flex:none" maxlength="20" aria-label="Quantity"><input name="store" list="stores" placeholder="Store" style="width:120px;flex:none" maxlength="60" aria-label="Store"><datalist id="stores">${stores().map(s => `<option value="${esc(s)}">`).join('')}</datalist><button class="btn go">Add</button>`);

function viewToday(now){
  const evs = (data.events || []).map(e => ({ ...e, s: parseEv(e.start, e.allDay), en: parseEv(e.end, e.allDay) }));
  const next = evs.find(e => !e.done && !e.allDay && e.en > now);
  const { c } = counts(), feats = myFeatures();
  const stat = (f, n, label) => feats.indexOf(f) >= 0 ? `<span><b>${n}</b>${label}</span>` : '';
  const head = `<div class="card next"><div>${next
      ? `<div class="lbl" style="color:var(--accent)">Next up${next.who && next.who.length ? ' · ' + next.who.map(esc).join(' & ') : ''}</div><div class="title">${esc(next.title)}</div><div class="lbl" style="margin-top:4px">${next.day === T() ? '' : dayName(next.day) + ' '}${fmt(next.s)} · <b>${next.s <= now ? 'happening now' : countdown(next.s - now)}</b></div>`
      : `<div class="lbl">${now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' })}</div><div class="title">Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, ${esc(data.me.name)}</div>`}</div>
    <div class="stats lbl">${stat('Calendar', c.calendar, 'events today')}${stat('To-dos', c.todos, (mineOnly && multi() ? 'my ' : '') + 'to-dos')}${stat('Bills & renewals', c.bills, 'bills this week')}${stat('Home & car upkeep', c.upkeep, 'upkeep due')}${stat('Follow-ups', c.followups, 'follow-ups due')}</div></div>`;
  const nf = newFeatures();
  const banner = nf.length ? `<div class="banner">New on this dashboard: <b>${nf.map(esc).join(', ')}</b>. <button class="btn sm" data-go="view">Add to my view</button> <button class="btn sm" data-dismiss>Not now</button></div>` : '';
  const cards = feats.map(f => TODAY[f] ? TODAY[f](now) : '').filter(Boolean);
  return banner + head + `<div class="grid">${cards.join('') || card('Today', empty('Nothing needs you right now.'))}</div>`;
}

/* =========================================================
   Tab views
   ========================================================= */
/* ---------- Family edition pieces ---------- */
const daysTo = d => Math.round((pd(d) - pd(T())) / 864e5);
const gWhen = g => `${dayName(g.date)}${g.time ? ' · ' + fmt(new Date(g.start)) : ''} · ${inDays(g.days)}`;
const mapLink = a => `https://www.google.com/maps/search/?api=1&query=${enc(a)}`;
let recipeQ = '', mkType = load('dash-mktype') || '', storyOpen = {};
const myRegion = () => { const r = load('dash-region') || ''; return (data.regions || []).indexOf(r) >= 0 ? r : ''; };
function marketCard(m){
  const mine = m.from === data.me.name, mineTaken = m.taker === data.me.name, help = m.type === 'Need help', org = data.me.role === 'Organizer';
  const tel = m.phone ? m.phone.replace(/[^\d+]/g, '') : '';
  const a = [];
  if (!ro()){
    if (m.status === 'Open' && !mine) a.push(`<button class="go" data-mtake="${esc(m.id)}">${help ? 'I can help' : "I'll take it"}</button>`);
    if (mineTaken && m.status === 'Taken') a.push(`<button data-mreopen="${esc(m.id)}">Never mind</button>`);
    if (mine || org){ if (m.status === 'Taken') a.push(`<button data-mreopen="${esc(m.id)}">Reopen</button>`); if (m.status !== 'Done') a.push(`<button data-mdone="${esc(m.id)}">${help ? 'All sorted' : 'Gone'}</button>`); a.push(`<button data-mdel="${esc(m.id)}">Delete</button>`); }
  }
  if (!mine && tel) a.push(`<a href="sms:${esc(tel)}" target="_top">Text ${esc(m.from.split(' ')[0])}</a><a href="tel:${esc(tel)}" target="_top">Call</a>`);
  const status = m.status === 'Done' ? `<span class="tag">${help ? 'Sorted' : 'Gone'}</span>` : m.status === 'Taken' ? `<span class="tag">${help ? 'Helping: ' : 'Claimed by '}${esc(m.taker)}</span>` : '';
  return `<div class="row ${m.status === 'Done' ? 'done' : ''}" style="display:block"><div><span class="tag ${help ? 'help' : 'give'}">${help ? 'Needs help' : 'Free'}</span>${m.region ? `<span class="tag region">📍 ${esc(m.region)}</span>` : ''}${status}</div>
    <div style="margin-top:4px"><b>${esc(m.what)}</b></div>${m.details ? `<div style="white-space:pre-wrap">${esc(m.details)}</div>` : ''}
    <div class="muted sm">${esc(m.from)}${m.posted ? ' · ' + new Date(m.posted).toLocaleDateString([], { month:'short', day:'numeric' }) : ''}</div>${a.length ? `<div class="acts">${a.join('')}</div>` : ''}</div>`;
}
function storyCard(st){
  const long = st.story.length > 420, openS = storyOpen[st.id], canDel = !ro() && (st.from === data.me.name || data.me.role === 'Organizer');
  return `<section class="card"><h2 class="lbl">${esc(st.title)}${st.when ? `<span>${esc(st.when)}</span>` : ''}</h2><div class="row" style="display:block">
    <div class="story">${esc(long && !openS ? st.story.slice(0, 420).replace(/\s+\S*$/, '') + '…' : st.story)}</div>
    <div class="muted sm" style="margin-top:8px">Told by ${esc(st.from)}${st.about ? ' · about ' + esc(st.about) : ''}${st.posted ? ' · ' + new Date(st.posted).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : ''}</div>
    <div class="acts">${long ? `<button data-sopen="${esc(st.id)}">${openS ? 'Show less' : 'Read the rest'}</button>` : ''}${st.photo ? `<a href="${esc(st.photo)}" target="_blank" rel="noopener">Photos</a>` : ''}${canDel ? `<button data-sdel="${esc(st.id)}">Delete</button>` : ''}</div></div></section>`;
}
function gatheringCard(g){
  const by = (a) => g.rsvps.filter(x => x.answer === a);
  const yes = by('Yes'), maybe = by('Maybe'), no = by('No');
  const ans = g.mine ? g.mine.answer : '';
  const rsvp = ro() ? '' : `<div class="bar" style="border-top:none;padding-top:0">${['Yes', 'Maybe', 'No'].map(a => `<button class="btn ${ans === a ? 'go' : ''}" data-rsvp="${esc(g.id)}" data-ans="${a}">${a === 'Yes' ? "I'm coming" : a === 'Maybe' ? 'Maybe' : "Can't make it"}</button>`).join('')}
      ${ans === 'Yes' || ans === 'Maybe' ? `<label class="muted sm" style="display:flex;align-items:center;gap:6px">How many of you? <select data-rsvpcount="${esc(g.id)}" data-ans="${ans}">${Array.from({ length: 12 }, (_, i) => i + 1).map(n => `<option ${g.mine.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}</div>`;
  const names = list => list.map(x => esc(x.who) + (x.count > 1 ? ` (${x.count})` : '')).join(', ');
  const who = `<div class="row" style="display:block"><b>${g.headcount}</b> coming${maybe.length ? ` · ${maybe.length} maybe` : ''}${no.length ? ` · ${no.length} can't` : ''}
      ${g.rsvps.length ? `<div class="muted sm" style="margin-top:3px">${yes.length ? 'Coming: ' + names(yes) : ''}${maybe.length ? (yes.length ? '<br>' : '') + 'Maybe: ' + names(maybe) : ''}${no.length ? '<br>Can\'t: ' + names(no) : ''}</div>` : ''}</div>`;
  const bring = g.bring.map(b => `<div class="row"><span class="txt">${esc(b.item)}${b.who ? ` <span class="muted sm">· ${esc(b.who)}</span>` : ''}</span>
      ${ro() ? '' : !b.who ? `<button class="btn sm" data-claim="${b.row}" data-gid="${esc(g.id)}" data-item="${esc(b.item)}">I'll bring it</button>` : b.who === data.me.name ? `<button class="btn sm" data-claim="${b.row}" data-gid="${esc(g.id)}" data-item="${esc(b.item)}" data-undo="1">Undo</button>` : ''}</div>`).join('');
  const addBring = form('bring', `<input name="item" placeholder="Add something to bring" maxlength="200" aria-label="Item"><label class="lbl" style="display:flex;align-items:center;gap:4px"><input type="checkbox" name="mine" checked> I'll bring it</label><button class="btn">Add</button>`, `data-gid="${esc(g.id)}"`);
  return `<section class="card"><h2 class="lbl">${esc(g.title)}<span>${inDays(g.days)}</span></h2>
    <div class="row" style="display:block">${dayName(g.date)}${g.time ? ' · ' + fmt(new Date(g.start)) : ''}${g.where ? ` · <a href="${mapLink(g.where)}" target="_blank" rel="noopener">${esc(g.where)}</a>` : ''}
      ${g.host ? `<div class="muted sm">Host: ${esc(g.host)}</div>` : ''}${g.details ? `<div style="margin-top:4px;white-space:pre-wrap">${esc(g.details)}</div>` : ''}${g.by ? `<div class="muted sm" style="margin-top:4px">Please RSVP by ${esc(dayName(g.by))}</div>` : ''}</div>
    ${rsvp}${who}<div class="sub lbl">Bring list</div>${bring || empty('Nothing on the list yet.')}${addBring}</section>`;
}
function pollCard(p){
  const total = Math.max(1, p.voters);
  const rows = p.options.map(o => { const mine = p.mine.indexOf(o.text) >= 0, pct = Math.round(o.voters.length / total * 100);
    return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        ${p.open && !ro() ? `<button class="btn ${mine ? 'go' : ''}" data-vote="${esc(p.id)}" data-choice="${esc(o.text)}" style="white-space:normal;text-align:left">${mine ? '✓ ' : ''}${esc(o.text)}</button>` : `<span>${mine ? '✓ ' : ''}${esc(o.text)}</span>`}
        <span class="due">${o.voters.length}</span></div>
      <div class="bar-track" style="margin-top:6px"><div class="bar-fill" style="width:${pct}%"></div></div>${o.voters.length ? `<div class="muted sm" style="margin-top:3px">${o.voters.map(esc).join(', ')}</div>` : ''}</div>`; }).join('');
  return `<section class="card"><h2 class="lbl">${esc(p.question)}<span>${p.open ? (p.closes ? 'closes ' + inDays(daysTo(p.closes)) : 'open') : 'closed'}</span></h2>
    ${rows}<div class="muted sm" style="padding:6px 14px 10px">${p.voters} voted${p.multiple ? ' · pick as many as you like' : ' · tap again to take your vote back'}${p.by ? ' · asked by ' + esc(p.by) : ''}</div></section>`;
}
const VIEWS = {
  chat: () => viewChat(),
  directory(){
    const ds = data.directory || [], g = {};
    ds.forEach(x => (g[x.household || 'Family'] = g[x.household || 'Family'] || []).push(x));
    const person = x => `<div class="row" style="display:block"><b>${esc(x.name)}</b>${x.birthday ? ` <span class="muted sm">· 🎂 ${pd('2000-' + x.birthday).toLocaleDateString([], { month:'short', day:'numeric' })}${x.days !== null && x.days <= 30 ? ' (' + inDays(x.days) + ')' : ''}</span>` : ''}
      <div class="acts" style="margin-top:4px">${x.phone ? `<a href="tel:${esc(x.phone.replace(/[^\d+]/g, ''))}" target="_top">Call ${esc(x.phone)}</a><a href="sms:${esc(x.phone.replace(/[^\d+]/g, ''))}" target="_top">Text</a>` : ''}${x.email ? `<a href="mailto:${esc(x.email)}" target="_top">Email</a>` : ''}${x.address ? `<a href="${mapLink(x.address)}" target="_blank" rel="noopener">Map</a>` : ''}</div>
      ${x.address ? `<div class="muted sm" style="margin-top:4px">${esc(x.address)}</div>` : ''}${x.notes ? `<div class="muted sm">${esc(x.notes)}</div>` : ''}</div>`;
    return `<div class="grid">${Object.keys(g).map(h => card(esc(h), g[h].map(person).join(''))).join('') || card('Directory', empty('Add everyone to the Directory tab of the sheet.'))}</div>`;
  },
  gatherings(){
    const gs = data.gatherings || [];
    const f = form('gathering', `<input name="title" placeholder="What's the occasion?" maxlength="200" aria-label="Gathering" style="flex:2 1 200px"><input name="date" type="date" value="${T()}" aria-label="Date"><input name="time" type="time" aria-label="Time">
      <input name="where" placeholder="Where" maxlength="200" aria-label="Where"><input name="details" placeholder="Details (optional)" maxlength="2000" aria-label="Details" style="flex:2 1 200px"><button class="btn go">Add gathering</button>`, 'style="border-top:none"');
    return `<div class="grid">${gs.map(gatheringCard).join('') || card('Gatherings', empty('No gatherings planned yet.'))}</div>` + (f ? '<div style="height:18px"></div>' + card('Plan a gathering', f) : '');
  },
  polls(){
    const ps = data.polls || [];
    const f = form('poll', `<input name="question" placeholder="Ask the family…" maxlength="300" aria-label="Question" style="flex:1 1 100%"><textarea name="options" rows="3" placeholder="Options, one per line" aria-label="Options" style="flex:1 1 100%"></textarea>
      <label class="muted sm" style="display:flex;align-items:center;gap:6px">Closes <input name="closes" type="date" aria-label="Closes (optional)"></label><label class="lbl" style="display:flex;align-items:center;gap:4px"><input type="checkbox" name="multiple"> More than one choice</label><button class="btn go">Start the poll</button>`, 'style="border-top:none"');
    return `<div class="grid">${ps.map(pollCard).join('') || card('Polls', empty('No polls yet.'))}</div>` + (f ? '<div style="height:18px"></div>' + card('New poll', f) : '');
  },
  market(){
    const regs = data.regions || [], reg = myRegion(), all = data.market || [];
    const shown = all.filter(m => (!reg || !m.region || m.region === reg) && (!mkType || m.type === mkType));
    const chip = (attr, val, cur, label) => `<button class="btn sm ${cur === val ? 'go' : ''}" ${attr}="${esc(val)}">${esc(label)}</button>`;
    const filters = `<div class="bar" style="border:none;padding:0 0 10px;gap:6px">${regs.length ? chip('data-mregion', '', reg, 'All regions') + regs.map(r => chip('data-mregion', r, reg, '📍 ' + r)).join('') + '<span style="width:10px"></span>' : ''}
      ${chip('data-mtype', '', mkType, 'Everything')}${chip('data-mtype', 'Giving away', mkType, 'Free stuff')}${chip('data-mtype', 'Need help', mkType, 'Help wanted')}</div>`;
    const f = form('market', `<select name="type" aria-label="Type"><option value="Giving away">Giving away</option><option value="Need help">Need help</option></select>
      <input name="what" placeholder="What is it? (e.g. Kids' bikes, Ride to the airport)" maxlength="200" aria-label="What" style="flex:2 1 240px">
      ${regs.length ? `<select name="region" aria-label="Region"><option value="">Any region</option>${regs.map(r => `<option ${r === reg ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>` : ''}
      <input name="details" placeholder="Details (optional)" maxlength="2000" aria-label="Details" style="flex:1 1 100%"><button class="btn go">Post</button>`, 'style="border-top:none"');
    const give = shown.filter(m => m.type === 'Giving away'), help = shown.filter(m => m.type === 'Need help');
    return filters + `<div class="grid">${(!mkType || mkType === 'Giving away') ? card('Free to a good home', give.length ? give.map(marketCard).join('') : empty('Nothing listed' + (reg ? ' in ' + esc(reg) : '') + '.')) : ''}
      ${(!mkType || mkType === 'Need help') ? card('Can someone help?', help.length ? help.map(marketCard).join('') : empty('No one needs a hand' + (reg ? ' in ' + esc(reg) : '') + ' right now.')) : ''}</div>`
      + (f ? '<div style="height:18px"></div>' + card('Post something', f) : '')
      + (regs.length ? '' : (data.me.role === 'Organizer' ? '<div class="muted sm" style="margin-top:12px">Add region tags in Settings › Regions (e.g. Texas, Colorado, Out of state).</div>' : ''));
  },
  stories(){
    const ss = data.stories || [];
    const f = form('story', `<input name="title" placeholder="Title (e.g. The summer the creek flooded)" maxlength="200" aria-label="Title" style="flex:2 1 260px"><input name="when" placeholder="When (e.g. 1985)" maxlength="60" aria-label="When it happened">
      <input name="about" placeholder="About who? (optional)" maxlength="200" aria-label="About who"><textarea name="story" rows="7" placeholder="Tell the story…" aria-label="Story" style="flex:1 1 100%"></textarea>
      <input name="photo" placeholder="Link to photos (optional)" aria-label="Photo link" style="flex:1 1 100%"><button class="btn go">Share the story</button>`, 'style="border-top:none"');
    return (f ? card('Tell a story', `<details><summary style="padding:10px 14px;cursor:pointer">Write one</summary>${f}</details>`) + '<div style="height:18px"></div>' : '') +
      `<div class="stack" style="max-width:760px;margin:0 auto">${ss.map(storyCard).join('') || card('Stories', empty('No stories yet. Be the first!'))}</div>`;
  },
  recipes(){
    const rs = data.recipes || [], g = {};
    rs.forEach(r => (g[r.category || 'Recipes'] = g[r.category || 'Recipes'] || []).push(r));
    const row = r => `<div class="row" style="display:block" data-rname="${esc((r.name + ' ' + r.from + ' ' + r.category + ' ' + r.ingredients).toLowerCase())}">
      <button class="evbtn" data-ropen="${esc(r.id)}" aria-expanded="${!!open[r.id]}"><b>${esc(r.name)}</b>${r.from ? ` <span class="muted sm">· ${esc(r.from)}</span>` : ''}</button>
      ${open[r.id] ? `<div style="margin-top:8px">${r.ingredients ? `<div class="lbl" style="margin-top:4px">Ingredients</div><div style="white-space:pre-wrap">${esc(r.ingredients)}</div>` : ''}${r.steps ? `<div class="lbl" style="margin-top:8px">Steps</div><div style="white-space:pre-wrap">${esc(r.steps)}</div>` : ''}${r.link ? `<div class="acts"><a href="${esc(r.link)}" target="_blank" rel="noopener">Open the link</a></div>` : ''}</div>` : ''}</div>`;
    const f = form('recipe', `<input name="name" placeholder="Recipe name" maxlength="200" aria-label="Recipe name" style="flex:2 1 200px"><input name="from" placeholder="Whose recipe?" maxlength="100" aria-label="Whose recipe"><input name="category" placeholder="Category" maxlength="60" aria-label="Category">
      <textarea name="ingredients" rows="4" placeholder="Ingredients, one per line" aria-label="Ingredients" style="flex:1 1 100%"></textarea><textarea name="steps" rows="4" placeholder="Steps" aria-label="Steps" style="flex:1 1 100%"></textarea><input name="link" placeholder="Link (optional)" aria-label="Link" style="flex:1 1 100%"><button class="btn go">Save recipe</button>`, 'style="border-top:none"');
    return `<div class="bar" style="border:none;padding:0 0 14px"><input id="rsearch" placeholder="Search recipes or ingredients" value="${esc(recipeQ)}" aria-label="Search recipes" style="flex:1 1 260px"></div>
      <div class="grid">${Object.keys(g).map(k => card(esc(k), g[k].map(row).join(''))).join('') || card('Recipes', empty('No recipes yet.'))}</div>` + (f ? '<div style="height:18px"></div>' + card('Add a recipe', `<details><summary style="padding:10px 14px;cursor:pointer">Write one up</summary>${f}</details>`) : '');
  },
  calendar(now){
    const evs = data.events || [], days = {};
    evs.forEach(e => (days[e.day] = days[e.day] || []).push(e));
    const people = (data.people || []).filter(p => p.color);
    const legend = multi() ? `<div class="legend">${people.map(p => whoChip(p.name)).join('')}<span class="muted sm">· Events for everyone show without a name</span></div>` : '';
    const c = data.cal || {}, f = eventForm(null);
    const where = c.addTo === 'google' ? 'Goes to Google Calendar.' : 'Saved in the dashboard calendar.';
    return legend + (f ? card('Add to the calendar', f + `<div class="muted sm" style="padding:0 14px 10px">Leave the time blank for an all-day event. ${where} Tap any event for more.</div>`) + '<div style="height:18px"></div>' : '') +
      `<div class="grid">${Object.keys(days).sort().map(d => card(dayName(d), days[d].map(e => eventRow(e, now)).join(''))).join('') || card('Calendar', empty('Nothing scheduled.'))}</div>` +
      '<div style="height:18px"></div>' + subscribeCard();
  },
  week(now){
    const out = [];
    for (let i = 0; i < 7; i++){
      const d = plus(T(), i), rows = [];
      (data.events || []).filter(e => e.day === d).forEach(e => rows.push(eventRow(e, now)));
      (data.meals || []).filter(m => m.date === d).forEach(m => rows.push(mealRow(m)));
      (data.bills || []).filter(b => !b.paid && b.due === d).forEach(b => rows.push(`<div class="row"><span class="time">Bill</span><span class="txt">${esc(b.bill)}${b.amount !== null ? ' · ' + money(b.amount) : ''}</span></div>`));
      (data.upkeep || []).filter(u => u.due === d).forEach(u => rows.push(`<div class="row"><span class="time">Upkeep</span><span class="txt">${esc(u.item)}</span></div>`));
      (data.trips || []).filter(t => t.start === d).forEach(t => rows.push(`<div class="row"><span class="time">Trip</span><span class="txt"><b>${esc(t.trip)}</b> starts</span></div>`));
      (data.dates || []).filter(x => x.date === d).forEach(x => rows.push(`<div class="row"><span class="time">${esc(x.type || 'Date')}</span><span class="txt">${esc(x.name)}</span></div>`));
      if (on('Routines & chores')){ const dow = ['sun','mon','tue','wed','thu','fri','sat'][pd(d).getDay()]; (data.routines || []).filter(r => mine(r.who) && dueOnDay(r.days, dow) && !/every|daily/i.test(r.days)).forEach(r => rows.push(`<div class="row"><span class="time">Chore</span><span class="txt">${esc(r.name)}${forChips(r.who)}</span></div>`)); }
      out.push(`<section class="card ${i === 0 ? 'day' : ''}"><h2 class="lbl">${dayName(d)}</h2>${rows.join('') || empty('Free.')}</section>`);
    }
    return `<div class="grid">${out.join('')}</div>`;
  },
  todos(){
    const o = data.tasks.open.filter(x => mine(x.for)), lists = data.lists.concat(o.some(x => data.lists.indexOf(x.list) < 0) ? ['Other'] : []);
    return segMine() + `<div class="grid">${lists.map(l => { const items = o.filter(x => l === 'Other' ? data.lists.indexOf(x.list) < 0 : x.list === l);
      return card(esc(l), (items.length ? items.map(taskRow).join('') : empty('All clear.')) + (l === 'Other' ? '' : taskForm(l)), items.length); }).join('')}</div><p class="muted sm">${data.tasks.doneToday} done today.</p>`;
  },
  shopping(){
    const items = data.shopping || [], need = items.filter(s => !s.got), got = items.filter(s => s.got);
    const row = s => `<div class="row ${s.got ? 'done' : ''}"><button class="chk ${s.got ? 'on' : ''}" data-shop="${s.row}" data-item="${esc(s.item)}" data-got="${s.got ? 1 : 0}" aria-label="Got it">${s.got ? '✓' : ''}</button><span class="txt">${esc(s.item)}${s.qty ? ` <span class="pill">${esc(s.qty)}</span>` : ''}${s.by && multi() ? ` <span class="muted sm">· ${esc(s.by)}</span>` : ''}</span></div>`;
    const groups = {}; need.forEach(s => (groups[s.store || 'Anywhere'] = groups[s.store || 'Anywhere'] || []).push(s));
    const keys = Object.keys(groups).sort((a, b) => a === 'Anywhere' ? 1 : b === 'Anywhere' ? -1 : a.localeCompare(b));
    return `<div class="grid">${card('Need', (keys.length ? keys.map(k => `<div class="sub lbl">${esc(k)} · ${groups[k].length}</div>${groups[k].map(row).join('')}`).join('') : empty('Nothing on the list.')) + shopForm(), need.length)}
      ${card('In the cart', got.length ? got.map(row).join('') + (ro() ? '' : `<div class="bar"><button class="btn" data-clearshop>Clear ticked items</button></div>`) : empty('Tick items as you buy them.'), got.length)}</div>`;
  },
  meals(){
    const ms = data.meals || [], days = [...Array(7)].map((_, i) => plus(T(), i));
    const cookSel = multi() ? `<select name="cook" aria-label="Cook"><option value="">Cook?</option>${data.people.map(p => `<option>${esc(p.name)}</option>`).join('')}</select>` : '';
    const f = form('meal', `<input name="date" type="date" value="${T()}" aria-label="Date"><select name="meal" aria-label="Meal"><option>Breakfast</option><option>Lunch</option><option selected>Dinner</option><option>Snack</option></select>
      <input name="what" placeholder="What's cooking?" maxlength="200" aria-label="Dish">${cookSel}<button class="btn go">Add</button>
      <span class="muted sm" style="flex-basis:100%">Shortcuts:</span><button type="button" class="btn sm" data-meal-quick="Leftovers">Leftovers</button><button type="button" class="btn sm" data-meal-quick="Eating out">Eating out</button><button type="button" class="btn sm" data-meal-quick="Takeout">Takeout</button>`, 'style="border-top:none"');
    return (f ? card('Plan a meal', f) + '<div style="height:18px"></div>' : '') + `<div class="grid">${days.map(d => { const m = ms.filter(x => x.date === d); return card(dayName(d), m.length ? m.map(mealRow).join('') : empty('—')); }).join('')}</div>`;
  },
  routines(){
    const rs = (data.routines || []).filter(r => mine(r.who)), t = rs.filter(r => r.dueToday), l = rs.filter(r => !r.dueToday);
    return segMine() + `<div class="grid">${card('Today', t.length ? t.map(routineRow).join('') : empty('Nothing due today.'), `${t.filter(r => r.done).length}/${t.length}`)}
      ${card('Other days', l.length ? l.map(r => `<div class="row"><span class="txt">${esc(r.name)}${forChips(r.who)}</span><span class="lbl muted">${esc(r.days)}</span></div>`).join('') : empty('None.'))}</div>
      <p class="muted sm">Add routines in the Routines tab of the sheet. Days: "Every day", "Weekdays", "Weekends" or "Mon, Thu".</p>`;
  },
  upkeep(){
    const u = data.upkeep || [], cats = [...new Set(u.map(x => x.category || 'Other'))];
    return `<div class="grid">${cats.map(c => card(esc(c), u.filter(x => (x.category || 'Other') === c).map(upkeepRow).join(''))).join('') || card('Upkeep', empty('Add items in the Upkeep tab of the sheet.'))}</div>
      <p class="muted sm">Tap <b>Done today</b> after you do it, and the next due date moves forward. Add items and how often they repeat in the Upkeep tab.</p>`;
  },
  bills(){
    const b = data.bills || [], unpaid = b.filter(x => !x.paid), paid = b.filter(x => x.paid);
    const total = unpaid.filter(x => x.days !== null && x.days <= 30 && x.amount !== null).reduce((s, x) => s + x.amount, 0);
    return `<div class="grid">${card('Coming up', unpaid.length ? unpaid.map(billRow).join('') : empty('Nothing due.'), total ? money(total) + ' in 30 days' : '')}${paid.length ? card('Paid this cycle', paid.map(billRow).join('')) : ''}</div>
      <p class="muted sm">Add bills in the Bills tab. For monthly bills, put the day of the month (like 15); for yearly ones, a date.</p>`;
  },
  budget(){ const b = data.budget || []; return `<div class="grid">${card('This month', b.length ? b.map(budgetCard).join('') : empty('Add a budget in the Budget tab of the sheet.'))}</div><p class="muted sm">The thin line is where you'd be at an even pace through the month.</p>`; },
  goals(){ const g = data.goals || []; return `<div class="grid">${card('Savings goals', g.length ? g.map(goalRow).join('') : empty('Add goals in the Goals tab of the sheet.'))}</div>`; },
  numbers(){
    const ns = data.numbers || [];
    return ns.length ? `<div class="grid">${ns.map(n => card(esc(n.name), `<div style="padding:12px 14px 4px">${n.latest ? `<span class="big">${fmtNum(n, n.latest[1])}</span> <span class="lbl muted">${short(n.latest[0])}</span>` : '<span class="muted">No values yet.</span>'}</div>
      ${n.latest ? `<div class="lbl" style="padding:0 14px 8px;display:flex;gap:14px;flex-wrap:wrap"><span>Last ${delta(n.latest[1], n.prev, n.dec)}</span><span>30 days ${delta(n.latest[1], n.d30, n.dec)}</span></div>` : ''}<div style="padding:0 14px 12px">${spark(n.series)}</div>
      ${n.loggable ? form('number', `<input name="value" inputmode="decimal" placeholder="Today's value" aria-label="Value"><button class="btn go">Log</button>`, `data-name="${esc(n.name)}"`) : '<div class="muted sm" style="padding:0 14px 10px">Read from another sheet every 30 minutes.</div>'}`)).join('')}</div>` : card('Numbers', empty('Add a row to the Numbers tab to start tracking something.'));
  },
  trips(){
    const ts = data.trips || [];
    const tripCard = t => {
      const item = i => `<div class="row ${i.done ? 'done' : ''}"><button class="chk ${i.done ? 'on' : ''}" data-tripitem="${i.row}" data-item="${esc(i.item)}" data-done="${i.done ? 1 : 0}" aria-label="Done">${i.done ? '✓' : ''}</button><span class="txt">${esc(i.item)}${forChips(i.who)}</span></div>`;
      const before = t.items.filter(i => !/pack/i.test(i.type)), pack = t.items.filter(i => /pack/i.test(i.type));
      return card(esc(t.trip), `<div class="row"><span class="txt">${t.where ? esc(t.where) + ' · ' : ''}${t.start ? short(t.start) + (t.end && t.end !== t.start ? ' – ' + short(t.end) : '') : 'No dates yet'}${t.notes ? `<div class="muted sm">${esc(t.notes)}</div>` : ''}</span><span class="due ${t.days !== null && t.days <= 7 ? 'soon' : ''}">${t.days === null ? '' : t.days <= 0 ? 'Now' : inDays(t.days)}</span></div>
        ${t.links.length ? `<div class="bar" style="border-top:1px solid var(--soft)">${t.links.map((u, i) => `<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">Link ${i + 1} ↗</a>`).join('')}</div>` : ''}
        <div class="sub lbl">Before you go · ${before.filter(i => !i.done).length} left</div>${before.map(item).join('') || empty('Nothing yet.')}
        <div class="sub lbl">Packing · ${pack.filter(i => !i.done).length} left</div>${pack.map(item).join('') || empty('Nothing yet.')}
        ${form('tripitem', `<input name="item" placeholder="Add to this trip" maxlength="200" aria-label="Item"><select name="type" aria-label="List"><option>Before you go</option><option>Packing</option></select>${forSelect('')}<button class="btn go">Add</button>`, `data-trip="${esc(t.trip)}"`)}`);
    };
    const f = form('trip', `<input name="trip" placeholder="Trip name" maxlength="100" aria-label="Trip"><input name="where" placeholder="Where" maxlength="100" aria-label="Where"><input name="start" type="date" aria-label="Start"><input name="end" type="date" aria-label="End"><button class="btn go">Add trip</button>`, 'style="border-top:none"');
    return `<div class="grid">${ts.map(tripCard).join('') || card('Trips', empty('No upcoming trips.'))}</div>${f ? '<div style="height:18px"></div>' + card('New trip', f + '<div class="muted sm" style="padding:0 14px 10px">Add booking links in the Trips tab of the sheet.</div>') : ''}`;
  },
  'dates-out'(){
    const d = data.dateNights || { ideas: [] }, todo = d.ideas.filter(i => !i.tried), tried = d.ideas.filter(i => i.tried);
    const idea = i => `<div class="row ${i.tried ? 'done' : ''}"><button class="chk ${i.tried ? 'on' : ''}" data-idea="${i.row}" data-name="${esc(i.idea)}" data-tried="${i.tried ? 1 : 0}" aria-label="Tried">${i.tried ? '✓' : ''}</button><span class="txt">${esc(i.idea)}${i.cost ? ` <span class="pill">${esc(i.cost)}</span>` : ''}</span></div>`;
    const next = d.next ? `<div class="row"><span class="txt"><b>${esc(d.next.title)}</b><div class="muted sm">${d.next.allDay ? dayName(d.next.start) : dayName(ymd(new Date(d.next.start))) + ' · ' + fmt(new Date(d.next.start))}</div></span><span class="due">${d.next.allDay ? '' : countdown(new Date(d.next.start) - new Date())}</span></div>`
      : empty('Nothing on the calendar. Add an event with "date night" in the title and it shows up here.');
    return `<div class="grid">${card('Next date night', next + (d.turn ? `<div class="bar"><span>${whoChip(d.turn)} plans the next one</span>${ro() ? '' : '<button class="btn sm" data-turn>Done – switch turns</button>'}</div>` : ''))}
      ${card('Ideas', (todo.map(idea).join('') || empty('Add a few ideas.')) + form('idea', `<input name="idea" placeholder="Add an idea" maxlength="200" aria-label="Idea"><select name="cost" aria-label="Cost"><option value="">Cost</option><option>$</option><option>$$</option><option>$$$</option></select><button class="btn go">Add</button>`), todo.length)}
      ${tried.length ? card('Done it', tried.map(idea).join('')) : ''}</div>`;
  },
  dates(){ const ds = data.dates || []; return card('Important dates', ds.length ? ds.map(d => `<div class="row"><span class="txt">${esc(d.name)}${d.type ? `<span class="tag">${esc(d.type)}</span>` : ''}${d.years ? ` <span class="muted">· ${d.years}</span>` : ''}<div class="muted sm">${pd(d.date).toLocaleDateString([], { weekday:'short', month:'long', day:'numeric' })}</div></span><span class="due ${d.days <= 7 ? 'soon' : ''}">${inDays(d.days)}</span></div>`).join('') : empty('Add birthdays and anniversaries to the Dates tab.')); },
  notes(){
    const ns = data.notes || [];
    const f = form('note', `<input name="text" placeholder="Write a note" maxlength="1000" aria-label="Note"><label class="lbl" style="display:flex;align-items:center;gap:4px"><input type="checkbox" name="pin"> Pin</label><button class="btn go">Post</button>`, 'style="border-top:none"');
    return (f ? card('Post a note', f) + '<div style="height:18px"></div>' : '') + card('Notes', ns.length ? ns.map(n => `<div class="row"><span class="txt">${n.pin ? '📌 ' : ''}${esc(n.text)}<div class="muted sm">${esc(n.from)}${n.at ? ' · ' + new Date(n.at).toLocaleDateString([], { month:'short', day:'numeric' }) : ''}</div></span>
      ${ro() ? '' : `<span class="acts" style="margin:0"><button data-pin="${n.row}" data-text="${esc(n.text)}" data-on="${n.pin ? 0 : 1}">${n.pin ? 'Unpin' : 'Pin'}</button><button data-delnote="${n.row}" data-text="${esc(n.text)}">Delete</button></span>`}</div>`).join('') : empty('No notes yet.'));
  },
  links(){ const ls = data.links || [], g = {}; ls.forEach(l => (g[l.list || 'Links'] = g[l.list || 'Links'] || []).push(l)); return `<div class="grid">${Object.keys(g).map(k => card(esc(k), g[k].map(linkRow).join(''))).join('') || card('Links', empty('Add links in the Links tab of the sheet.'))}</div>`; },
  followups(){
    const all = data.followups || [], t = T(), wk = plus(t, 7);
    const groups = [['Overdue', all.filter(f => f.due && f.due < t)], ['Today', all.filter(f => f.due === t)], ['Next 7 days', all.filter(f => f.due > t && f.due <= wk)], ['Later', all.filter(f => !f.due || f.due > wk)]].filter(g => g[1].length);
    const anyOpen = all.some(f => open[f.id]);
    const f = form('followup', `<input name="person" placeholder="Who" maxlength="100" aria-label="Who" style="flex:1 1 140px"><input name="topic" placeholder="About (optional)" maxlength="200" aria-label="Topic" style="flex:1 1 140px"><input name="due" type="date" value="${plus(t, 1)}" aria-label="Due"><select name="channel" aria-label="How"><option>Email</option><option>Text</option><option>Call</option><option>Other</option></select>
      <input name="to" placeholder="Email (optional)" maxlength="200" aria-label="Email" style="flex:1 1 160px"><input name="phone" placeholder="Phone (optional)" maxlength="40" aria-label="Phone" style="flex:1 1 120px"><input name="subject" placeholder="Subject (optional)" maxlength="300" aria-label="Subject" style="flex:2 1 220px"><textarea name="message" placeholder="Message to send" aria-label="Message" style="flex:1 1 100%;min-height:90px"></textarea><button class="btn go">Add follow-up</button>`, 'style="border-top:none"');
    return `<div class="stack">${card('Follow-ups', groups.length ? groups.map(([n, l]) => `<div class="sub lbl ${n === 'Overdue' ? 'late' : ''}">${n} · ${l.length}</div>${l.map(fuRow).join('')}`).join('') : empty('No open follow-ups.'), all.length ? `<button class="btn sm" data-allfu="${anyOpen ? 'close' : 'open'}">${anyOpen ? 'Collapse all' : 'Expand all'}</button>` : '')}${f ? card('New follow-up', f) : ''}</div>`;
  },
  inventory(){
    const items = (data.inventory || []).slice().sort((a, b) => ((a.onHand < a.par) ? 0 : 1) - ((b.onHand < b.par) ? 0 : 1));
    return card('Inventory', items.length ? items.map(i => { const low = i.onHand !== null && i.par !== null && i.onHand < i.par;
      return `<div class="row" style="align-items:center"><span class="txt">${esc(i.item)}${low ? ' <span class="due late">Low</span>' : ''}<div class="muted sm">Par ${i.par === null ? '—' : i.par} ${esc(i.unit)}${i.where ? ' · ' + esc(i.where) : ''}</div></span>
        <span class="qty" ${ro() ? 'data-needs-edit' : ''}><button data-inv="${i.row}" data-item="${esc(i.item)}" data-v="${(i.onHand || 0) - 1}" aria-label="One less">−</button><b class="lbl" style="min-width:34px;text-align:center">${i.onHand === null ? '—' : i.onHand}</b><button data-inv="${i.row}" data-item="${esc(i.item)}" data-v="${(i.onHand || 0) + 1}" aria-label="One more">+</button></span></div>`; }).join('') : empty('Add items to the Inventory tab.'));
  },
  view(){
    if (!draft){
      const mineL = myFeatures(), rest = enabledFeatures().filter(f => mineL.indexOf(f) < 0);
      draft = { list: mineL.map(f => [f, true]).concat(rest.map(f => [f, false])), look: (data.view && data.view.look) || '', text: (data.view && data.view.text) || '', mode: (data.view && data.view.mode) || '' };
    }
    const desc = { 'Calendar':'Events, colored by person', 'Week ahead':'The next 7 days on one screen', 'To-dos':'Checklists', 'Shopping list':'Grouped by store', 'Meal plan':"This week's meals",
      'Routines & chores':'Daily and weekly checklists', 'Home & car upkeep':"What's due around the house", 'Bills & renewals':'Due dates and Paid', 'Budget snapshot':'Spending vs. budget',
      'Savings goals':'Progress bars', 'Numbers':'Anything you track', 'Trips':'Countdowns and lists', 'Date nights':'Next one and ideas', 'Important dates':'Birthdays and anniversaries',
      'Notes board':'Notes and announcements', 'Links':'Pinned links', 'Follow-ups':'Messages to send', 'Inventory alerts':'Running low',
      'Messages':'Family chat, groups and private messages', 'Family directory':'Phones, emails, addresses', 'Gatherings':'RSVPs and bring lists', 'Polls':'Quick family votes', 'Recipes':'The family cookbook', 'Marketplace':'Give things away, ask for help', 'Stories':'Family stories and memories' };
    const rows = draft.list.map(([f, onv], i) => `<div class="vrow"><button class="chk ${onv ? 'on' : ''}" data-vtoggle="${i}" aria-label="Show ${esc(f)}" style="pointer-events:auto;opacity:1">${onv ? '✓' : ''}</button>
      <span class="txt"><b>${esc(f)}</b> <span class="muted sm">${esc(desc[f] || '')}</span></span>
      <button class="mv" data-vmove="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="mv" data-vmove="${i}" data-dir="1" ${i === draft.list.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></div>`).join('');
    const looks = [['', 'Dashboard default'], ['paper', 'Paper'], ['light', 'Light'], ['dark', 'Dark'], ['ivory', 'Ivory & gold'], ['burgundy', 'Burgundy & gold'], ['sky', 'Sky & navy']];
    return `<div class="stack" style="max-width:720px;margin:0 auto">${card('My view · ' + esc(data.me.name), `<div class="muted sm" style="padding:10px 14px 4px">Tick what you want on your Today screen and tab bar, and put it in your order. This only changes your view – nobody else's.</div>${rows}`)}
      ${card('Look', `<div class="row" style="flex-wrap:wrap">${looks.map(([v, n]) => `<button class="btn ${draft.look === v ? 'go' : ''}" data-vlook="${v}">${n}</button>`).join('')}</div><div class="row" style="align-items:center;flex-wrap:wrap"><span class="txt">Light or dark<div class="muted sm">Auto follows your phone or computer.</div></span><span class="seg">${[['', 'As is'], ['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(([k, l]) => `<button data-vmode="${k}" aria-pressed="${(draft.mode || '') === k}">${l}</button>`).join('')}</span></div><div class="row"><span class="txt">Larger text</span><button class="chk ${draft.text === 'large' ? 'on' : ''}" data-vtext style="pointer-events:auto;opacity:1" aria-label="Larger text">${draft.text === 'large' ? '✓' : ''}</button></div>`)}
      ${notifCard()}
      <div class="bar" style="border:none;padding:0;justify-content:flex-end"><button class="btn" data-vcancel>Cancel</button><button class="btn go" data-vsave>Save my view</button></div>
      <p class="muted sm">${ro() ? 'Your link is view-only: you can set up your view, but not change anything else. ' : ''}The organizer decides which features this dashboard has; new ones appear here when they're turned on.</p></div>`;
  },
};
function dueOnDay(days, dow){ const d = String(days).toLowerCase(); if (!d || /every|daily/.test(d)) return true; if (/weekday/.test(d)) return ['mon','tue','wed','thu','fri'].indexOf(dow) >= 0; if (/weekend/.test(d)) return dow === 'sat' || dow === 'sun'; return d.split(/[^a-z]+/).some(x => x.slice(0, 3) === dow); }

function viewProblem(){
  const slow = /timeout/.test(lastMsg);
  if (lastErr === 'mismatch') return `<section class="card" style="max-width:560px;margin:0 auto"><h2 class="lbl">The two code files don't match</h2>
    <div style="padding:12px 14px">${esc(lastMsg)}</div><div class="muted sm" style="padding:0 14px 12px">Organizer: in Apps Script, replace all of Code.gs with the v2 file (and App with the v2 App.html), save both, then Deploy › Manage deployments › pencil › Version: New version › Deploy. Then run Dashboard › 1. Set up once.</div>
    <div class="bar"><button class="btn go" data-refresh>Retry</button></div></section>`;
  return `<section class="card" style="max-width:560px;margin:0 auto"><h2 class="lbl">${slow ? 'Google is taking too long' : "Couldn't load the dashboard"}</h2>
    <div style="padding:12px 14px">${slow ? 'The script didn\'t answer within 45 seconds. The first load after a new deployment can be slow – try Retry once.' : 'The script reported: <b>' + esc(lastMsg) + '</b>'}</div>
    <div class="muted sm" style="padding:0 14px 12px">Organizer: open the sheet › Extensions › Apps Script › Executions (clock icon) to see the details. If you haven't yet, run Dashboard › 1. Set up, and run <b>test</b> once in Apps Script to approve access.</div>
    <div class="bar"><button class="btn go" data-refresh>Retry</button></div></section>`;
}
function viewUnlock(){
  const si = signInfo || {};
  if (si.loading) return '<div class="empty">Loading…</div>';
  if (si.code) return `<section class="card" style="max-width:440px;margin:0 auto"><h2 class="lbl">Sign in</h2>
    <div style="padding:12px 14px 4px">${lastErr === 'expired' ? "It's been a while – please sign in again with your first name and 4-digit code." : lastErr === 'badkey' ? 'Please sign in with your first name and your 4-digit code.' : 'Type your first name and your 4-digit code.'}</div>
    <form class="add" data-form="signin" style="border-top:none;flex-direction:column;align-items:stretch">
      <input name="name" placeholder="First name" autocomplete="username" autocapitalize="words" spellcheck="false" aria-label="First name" maxlength="60">
      <input name="code" placeholder="4-digit code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="current-password" aria-label="4-digit code" style="letter-spacing:.4em;font-size:1.2em">
      <button class="btn go">Sign in</button></form>
    <div class="muted sm" style="padding:0 14px 12px">Don't know your code? Ask the family organizer.${si.codeOnly ? '' : ' Have a private link instead? Open it on this device.'}</div></section>`;
  return `<section class="card" style="max-width:520px;margin:0 auto"><h2 class="lbl">Unlock this device</h2>
    <div style="padding:12px 14px">${lastErr === 'badkey' ? 'That link has been turned off or replaced. Ask the organizer for your new link.' : 'Open your own app link on this device (the organizer sends it), or paste it here.'}</div>
    <form class="add" data-form="key"><input name="key" placeholder="Paste your link" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Link"><button class="btn go">Unlock</button></form></section>`;
}

/* =========================================================
   Render
   ========================================================= */
/** Light/dark/auto: each look has a light and a dark version. */
function lookFor(look, want){
  if (!want) return look;
  const DARK = { sky: 'skynight', paper: 'dark', light: 'dark', ivory: 'burgundy' }, LIGHT = { skynight: 'sky', dark: 'light', burgundy: 'ivory' };
  return want === 'dark' ? (DARK[look] || look) : (LIGHT[look] || look);
}
if (window.matchMedia) try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (data) applyLook(); }); } catch (_) {}
function applyLook(){
  const v = data.view || {}, L = ['paper', 'light', 'dark', 'ivory', 'burgundy', 'sky'], want = (draft && draft.look) || v.look;
  const chosen = L.indexOf(want) >= 0 ? want : (L.indexOf(data.look) >= 0 ? data.look : 'paper');
  const mode = draft && draft.mode !== undefined ? draft.mode : v.mode || '', sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const look = lookFor(chosen, mode === 'dark' || (mode === 'auto' && sysDark) ? 'dark' : mode ? 'light' : '');
  const brandLook = look === 'ivory' || look === 'burgundy' || look === 'sky' || look === 'skynight';
  const large = (draft ? draft.text : v.text) === 'large';
  const cls = look + (look === 'skynight' ? ' sky' : '') + (brandLook ? ' paper' : '') + (large ? ' large' : '') + (ro() ? ' ro' : '') + (document.body.classList.contains('inchat') ? ' inchat' : '');
  document.body.className = cls; document.documentElement.className = look + (look === 'skynight' ? ' sky' : '') + (large ? ' large' : '');
  const tc = document.querySelector('meta[name=theme-color]'); if (tc){ const bg = getComputedStyle(document.body).getPropertyValue(look === 'sky' ? '--sky' : '--bg').trim(); if (bg) tc.setAttribute('content', bg); }
  if (brandLook) document.body.style.removeProperty('--accent'); else document.body.style.setProperty('--accent', data.accent || '#50602B');
  const lg = $('#logo'); if (data.logo){ if (lg.getAttribute('src') !== data.logo) lg.src = data.logo; lg.hidden = false; } else lg.hidden = true;
  $('#tagline').textContent = data.tagline || '';
}
function render(){
  const now = new Date();
  if (!data && signInfo && signInfo.name){ const L = ['paper', 'light', 'dark', 'ivory', 'burgundy', 'sky'], lk = L.indexOf(signInfo.look) >= 0 ? signInfo.look : 'paper';
    document.documentElement.className = lk; document.body.className = lk + (/ivory|burgundy|sky/.test(lk) ? ' paper' : ''); $('#brand').textContent = signInfo.name; document.title = signInfo.name;
    const lg = $('#logo'); if (signInfo.logo){ lg.src = signInfo.logo; lg.hidden = false; } }
  if (!data){ $('#nav').innerHTML = ''; $('#nav').hidden = true; $('#menubtn').hidden = true; $('#me').innerHTML = ''; $('#main').innerHTML = (lastErr === 'nokey' || lastErr === 'badkey' || lastErr === 'expired') ? viewUnlock() : lastErr ? viewProblem() : `<div class="empty">Loading…</div>`; return; }
  applyLook();
  $('#brand').textContent = data.name || 'Dashboard'; document.title = data.name || 'Dashboard';
  $('#me').innerHTML = `<span>${whoChip(data.me.name)}${ro() ? ' <span class="tag">View only</span>' : ''}</span><button data-go="view">My view</button>${data.signin ? '<button data-signout>Sign out</button>' : ''}`;
  const feats = myFeatures(), tabs = [['today', 'Today']].concat(feats.map(f => [tabOf(f), TABNAME[tabOf(f)] || f]).filter(x => x[0]));
  if (tab !== 'view' && !tabs.some(t => t[0] === tab)) tab = 'today';
  const { c, late } = counts();
  const todayN = feats.reduce((n, f) => n + ({ 'Calendar': c.calendar, 'Bills & renewals': c.bills, 'Follow-ups': c.followups, 'Routines & chores': c.routines, 'Messages': c.chat }[f] || 0), 0);
  const badge = k => { const cnt = k === 'today' ? todayN : c[k]; return cnt ? `<span class="n ${late[k] ? 'warn' : ''}">${cnt}</span>` : ''; };
  $('#nav').innerHTML = tabs.map(([k, n]) => `<button data-tab="${k}" aria-selected="${k === tab}"><span>${esc(n)}</span>${badge(k)}</button>`).join('') + '<hr><button data-go="view" aria-selected="' + (tab === 'view') + '"><span>My view</span></button>';
  $('#nav').hidden = !menuOpen; $('#menubtn').hidden = false; $('#menubtn').setAttribute('aria-expanded', menuOpen);
  const curName = tab === 'view' ? 'My view' : ((tabs.find(t => t[0] === tab) || [])[1] || 'Today');
  $('#curtab').innerHTML = esc(curName) + (tab === 'today' && todayN ? ` <span class="n">${todayN}</span>` : '');
  if (tab !== 'chat' && chat.open) stopChat();
  const ta = $('.composer textarea'), taFocus = ta && document.activeElement === ta, taSel = ta ? [ta.selectionStart, ta.selectionEnd] : null; if (ta) chat.compose = ta.value;
  const ms0 = $('#msgs'), keepMs = ms0 && tab === 'chat' && chat.open ? [chat.open, ms0.scrollTop, ms0.scrollHeight - ms0.scrollTop - ms0.clientHeight] : null;
  document.body.classList.toggle('inchat', tab === 'chat' && !!chat.open);
  document.documentElement.style.setProperty('--hh', ($('header') ? $('header').offsetHeight : 0) + 'px');
  $('#main').innerHTML = tab === 'today' ? viewToday(now) : VIEWS[tab] ? VIEWS[tab](now) : viewToday(now);
  if (keepMs && chat.open === keepMs[0]){ const ms = $('#msgs'); if (ms) ms.scrollTop = keepMs[2] < 80 ? ms.scrollHeight : keepMs[1]; }
  if (taFocus){ const t2 = $('.composer textarea'); if (t2){ t2.focus(); try { t2.setSelectionRange(taSel[0], taSel[1]); } catch (_) {} } }
  renderSheet();
  if (tab === 'recipes' && recipeQ.trim()){ const q = recipeQ.trim().toLowerCase(); document.querySelectorAll('[data-rname]').forEach(r => { r.style.display = r.dataset.rname.indexOf(q) >= 0 ? '' : 'none'; }); }
  $('#foot').innerHTML = `Updated ${fmt(new Date(data.updated))} · <a href="#" data-refresh>Refresh</a>${data.sheet ? ` · <a href="${esc(data.sheet)}" target="_blank" rel="noopener">Open sheet</a>` : ''}${data.errors && data.errors.length ? '<br><span style="color:var(--warn)">' + esc(data.errors.join(' · ')) + '</span>' : ''}`;
}

/* =========================================================
   Clicks
   ========================================================= */
document.addEventListener('click', ev => {
  if (ev.target.closest('#menubtn')){ menuOpen = !menuOpen; render(); if (menuOpen){ const f = $('#nav [aria-selected=true]') || $('#nav button'); if (f) f.focus(); } return; }
  if (menuOpen && !ev.target.closest('#nav')){ menuOpen = false; render(); }
  const b = ev.target.closest('button, a[data-refresh]');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if ('signout' in d){ if (!confirm('Sign out on this device?')) return; KEY = ''; save('dash-key', ''); try { localStorage.removeItem('dash-cache'); } catch(_){} data = null; lastErr = 'nokey'; render(); return; }
  if (d.tab || d.go) menuOpen = false;
  if (d.tab){ if (tab === 'view') draft = null; tab = d.tab; save('dash-tab', tab); window.scrollTo(0, 0); render(); return; }
  if (d.go){ if (d.go !== 'view') draft = null; tab = d.go; if (d.go !== 'view') save('dash-tab', tab); window.scrollTo(0, 0); render(); return; }
  if (b.hasAttribute('data-refresh')){ ev.preventDefault(); refresh(); return; }
  if ('dismiss' in d){ const v = data.view || {}; data.view = Object.assign({}, v, { features: myFeatures(), seen: enabledFeatures() }); render(); act('saveView', { features: JSON.stringify(myFeatures()), look: v.look || '', text: v.text || '', seen: JSON.stringify(enabledFeatures()) }); return; }
  if ('mine' in d){ mineOnly = d.mine === '1'; save('dash-mine', mineOnly ? '1' : '0'); render(); return; }
  if (d.expand){ expanded[d.expand] = !expanded[d.expand]; render(); return; }
  // My view
  if (d.vtoggle !== undefined){ const r = draft.list[Number(d.vtoggle)]; r[1] = !r[1]; render(); return; }
  if (d.vmove !== undefined){ const i = Number(d.vmove), j = i + Number(d.dir); const l = draft.list; [l[i], l[j]] = [l[j], l[i]]; render(); return; }
  if (d.vlook !== undefined){ draft.look = d.vlook; render(); return; }
  if (d.vmode !== undefined){ draft.mode = d.vmode; render(); return; }
  if ('vtext' in d){ draft.text = draft.text === 'large' ? '' : 'large'; render(); return; }
  if ('vcancel' in d){ draft = null; tab = 'today'; render(); return; }
  if (d.evopen){ evOpen = evOpen === d.evopen ? null : d.evopen; if (evEdit && evEdit.id !== evOpen) evEdit = null; render(); return; }
  if (d.feedmine !== undefined){ feedMine = d.feedmine === '1'; save('dash-feedmine', feedMine ? '1' : '0'); render(); return; }
  if (d.copylink){ copyText(d.copylink); return; }
  if ('evcancel' in d){ evEdit = null; render(); return; }
  if ('vsave' in d){ const feats = draft.list.filter(x => x[1]).map(x => x[0]); data.view = { features: feats, look: draft.look, text: draft.text, mode: draft.mode, seen: enabledFeatures() }; const look = draft.look, text = draft.text, mode = draft.mode || ''; draft = null; tab = 'today'; render(); act('saveView', { features: JSON.stringify(feats), look, text, mode, seen: JSON.stringify(enabledFeatures()) }).then(() => toast('Your view is saved')); return; }
  if (d.ropen){ open[d.ropen] = !open[d.ropen]; render(); return; }
  if (d.mregion !== undefined){ save('dash-region', d.mregion); render(); return; }
  if (d.mtype !== undefined){ mkType = d.mtype; save('dash-mktype', mkType); render(); return; }
  if (d.sopen){ storyOpen[d.sopen] = !storyOpen[d.sopen]; render(); return; }
  if (ro()) return;
  // Actions
  if (d.task){ if (busy[d.task]) return; busy[d.task] = true; render(); setTimeout(() => act('toggleTask', { id: d.task, done: '1' }), 400); return; }
  if (d.ev){ const e = data.events.find(x => x.id === d.ev); if (e) e.done = d.done !== '1'; busy[d.ev] = true; render(); act('toggleEvent', { id: d.ev, done: d.done === '1' ? '0' : '1' }); return; }
  if (d.evedit){ evEdit = { id: d.evedit }; render(); return; }
  if (d.evdel){ if (!confirm(d.rep === '1' ? 'Delete this event and every repeat of it?' : 'Delete this event?')) return; data.events = data.events.filter(x => x.key !== d.evdel); evOpen = null; render(); act('deleteEvent', { id: d.evdel }).then(() => { if (!lastErr) toast('Deleted'); }); return; }
  if (d.rsvp){ const g = data.gatherings.find(x => x.id === d.rsvp); const cnt = g && g.mine ? g.mine.count : 1; if (g) g.mine = { who: data.me.name, answer: d.ans, count: cnt }; render(); act('rsvp', { id: d.rsvp, answer: d.ans, count: cnt }).then(() => { if (!lastErr) toast(d.ans === 'No' ? 'Thanks for letting them know' : d.ans === 'Yes' ? "See you there!" : 'Marked maybe'); }); return; }
  if (d.mtake){ const m = data.market.find(x => x.id === d.mtake); if (m){ m.status = 'Taken'; m.taker = data.me.name; } render(); act('marketTake', { id: d.mtake }).then(() => { if (!lastErr) toast(m && m.type === 'Need help' ? "Thanks! Let them know you're coming." : "It's yours – let them know."); }); return; }
  if (d.mreopen){ act('marketReopen', { id: d.mreopen }); return; }
  if (d.mdone){ act('marketDone', { id: d.mdone }); return; }
  if (d.mdel){ if (!confirm('Delete this post?')) return; data.market = data.market.filter(x => x.id !== d.mdel); render(); act('marketDelete', { id: d.mdel }); return; }
  if (d.sdel){ if (!confirm('Delete this story?')) return; data.stories = data.stories.filter(x => x.id !== d.sdel); render(); act('storyDelete', { id: d.sdel }); return; }
  if (d.claim){ act('bringClaim', { row: d.claim, id: d.gid, item: d.item, undo: d.undo || '' }); return; }
  if (d.vote){ const p = data.polls.find(x => x.id === d.vote); if (p){ const has = p.mine.indexOf(d.choice) >= 0; p.mine = has ? p.mine.filter(x => x !== d.choice) : (p.multiple ? p.mine.concat(d.choice) : [d.choice]); } render(); act('vote', { id: d.vote, choice: d.choice }); return; }
  if ('routine' in d){ const r = data.routines.find(x => x.name === d.routine && x.who === d.rwho); if (r) r.done = !r.done; render(); act('toggleRoutine', { name: d.routine, rwho: d.rwho }); return; }
  if (d.shop){ const s = data.shopping.find(x => String(x.row) === d.shop); if (s) s.got = d.got !== '1'; render(); act('toggleShop', { row: d.shop, item: d.item, got: d.got === '1' ? '0' : '1' }); return; }
  if ('clearshop' in d){ data.shopping = data.shopping.filter(s => !s.got); render(); act('clearShop', {}); return; }
  if (d.bill){ act('billPaid', { row: d.bill, bill: d.name, undo: d.undo }).then(() => { if (!lastErr) toast(d.undo === '1' ? 'Marked unpaid' : 'Marked paid'); }); return; }
  if (d.upkeep){ act('upkeepDone', { row: d.upkeep, item: d.name }).then(() => { if (!lastErr) toast('Logged – next due date updated'); }); return; }
  if (d.tripitem){ act('tripItem', { row: d.tripitem, item: d.item, done: d.done === '1' ? '0' : '1' }); return; }
  if (d.idea){ act('ideaTried', { row: d.idea, idea: d.name, tried: d.tried === '1' ? '0' : '1' }); return; }
  if ('turn' in d){ act('nextTurn', {}); return; }
  if (d.mealQuick){ const f = b.closest('form'); f.elements.namedItem('what').value = d.mealQuick; return; }
  if (d.pin){ act('pinNote', { row: d.pin, text: d.text, pin: d.on }); return; }
  if (d.delnote){ if (!confirm('Delete this note?')) return; act('deleteNote', { row: d.delnote, text: d.text }); return; }
  if (d.inv){ const i = data.inventory.find(x => String(x.row) === d.inv), v = Math.max(0, Number(d.v)); if (i) i.onHand = v; render(); act('setInventory', { row: d.inv, item: d.item, onHand: v }); return; }
  if (d.toggle){ if (editing[d.toggle]) return; open[d.toggle] = !open[d.toggle]; render(); return; }
  if (d.allfu){ const o = d.allfu === 'open'; (data.followups || []).forEach(f => { if (!editing[f.id]) open[f.id] = o; }); render(); return; }
  if (d.copy){ const f = data.followups.find(x => x.id === d.copy); if (f) copyText(f.message); return; }
  if (d.edit){ const f = data.followups.find(x => x.id === d.edit); if (!f) return; editing[f.id] = { to: f.to, subject: f.subject, message: f.message }; open[f.id] = true; render(); return; }
  if (d.cancel){ delete editing[d.cancel]; render(); return; }
  if (d.save){ const ed = editing[d.save], f = data.followups.find(x => x.id === d.save); if (!ed || !f) return;
    if (f.channel === 'Email' && ed.to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ed.to.trim())){ toast('That email address looks wrong'); return; }
    Object.assign(f, { to: ed.to.trim(), subject: ed.subject, message: ed.message }); delete editing[d.save]; busy[d.save] = true; render(); act('editFollowup', { id: d.save, to: f.to, subject: f.subject, message: f.message }).then(() => toast('Saved')); return; }
  if (d.fu){ busy[d.fu] = true; render(); act('followup', { id: d.fu, status: d.st }); return; }
});
document.addEventListener('click', ev => { const c = ev.target.closest('[data-copy]'); if (c && ro()){ const f = data.followups.find(x => x.id === c.dataset.copy); if (f) copyText(f.message); } });

/* =========================================================
   Forms
   ========================================================= */
document.addEventListener('submit', ev => {
  const f = ev.target.closest('form[data-form]'); if (!f) return;
  ev.preventDefault();
  const v = n => { const el = f.elements.namedItem(n); return el ? (el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value.trim()) : ''; };
  const kind = f.dataset.form;
  if (kind === 'signin'){
    const name = v('name'), code = v('code');
    if (!name || !/^\d{4}$/.test(code)){ toast('Type your first name and your 4-digit code'); return; }
    const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Signing in…';
    runFn('signIn', name, code).then(k => { KEY = k; save('dash-key', k); lastErr = null; $('#main').innerHTML = '<div class="empty">Loading…</div>'; refresh(); },
      e => { btn.disabled = false; btn.textContent = 'Sign in'; toast(String(e && e.message || e).replace(/^(Error|Exception):\s*/, '')); });
    return;
  }
  if (kind === 'key'){ const k = v('key').replace(/^.*#/, ''); if (!k) return; KEY = k; save('dash-key', k); lastErr = null; $('#main').innerHTML = '<div class="empty">Loading…</div>'; refresh(); return; }
  if (ro()) return;
  const done = msg => () => { if (!lastErr && msg) toast(msg); };
  switch (kind){
    case 'task': { const text = v('text'); if (!text) return; const list = f.dataset.list || v('list'); data.tasks.open.push({ id: 'new' + Date.now(), list, text, order: 1e15, for: v('for') }); render(); act('addTask', { list, text, for: v('for') }); return; }
    case 'event': {
      if (!v('title')){ toast('Add a title'); return; }
      if (!v('date')){ toast('Pick a date'); return; }
      const p = { title: v('title'), date: v('date'), time: v('time'), end: v('end'), who: v('who'), repeats: v('repeats'), until: v('until'), where: v('where'), notes: v('notes') };
      if (f.dataset.edit){ evEdit = null; act('editEvent', Object.assign({ id: f.dataset.edit }, p)).then(done('Saved' + (p.repeats ? ' (every repeat)' : ''))); return; }
      act('addEvent', p).then(done('Added to the calendar')); f.reset(); return;
    }
    case 'shop': { const item = v('item'); if (!item) return; (data.shopping = data.shopping || []).push({ row: 0, item, qty: v('qty'), by: data.me.name, got: false, store: v('store') }); render(); act('addShop', { item, qty: v('qty'), store: v('store') }); return; }
    case 'note': if (!v('text')) return; act('addNote', { text: v('text'), pin: v('pin') }); f.reset(); return;
    case 'meal': if (!v('what')){ toast("Add what's cooking"); return; } act('addMeal', { date: v('date'), meal: v('meal'), what: v('what'), cook: v('cook') }); f.reset(); return;
    case 'number': if (!v('value')) return; act('logNumber', { name: f.dataset.name, value: v('value') }).then(done('Logged')); return;
    case 'goal': if (!v('amount')) return; act('goalAdd', { row: f.dataset.row, goal: f.dataset.name, amount: v('amount') }).then(done('Added')); return;
    case 'trip': if (!v('trip') || !v('start')){ toast('Add a name and a start date'); return; } act('addTrip', { trip: v('trip'), where: v('where'), start: v('start'), end: v('end') }).then(done('Trip added')); return;
    case 'tripitem': if (!v('item')) return; act('addTripItem', { trip: f.dataset.trip, item: v('item'), type: v('type'), for: v('for') }); f.reset(); return;
    case 'idea': if (!v('idea')) return; act('addIdea', { idea: v('idea'), cost: v('cost') }); f.reset(); return;
    case 'gathering': if (!v('title') || !v('date')){ toast('Add a name and a date'); return; } act('addGathering', { title: v('title'), date: v('date'), time: v('time'), where: v('where'), details: v('details') }).then(done('Gathering added')); f.reset(); return;
    case 'bring': if (!v('item')) return; act('bringAdd', { id: f.dataset.gid, item: v('item'), mine: v('mine') }); f.reset(); return;
    case 'poll': { const opts = f.elements.namedItem('options').value.split(/\n/).map(x => x.trim()).filter(Boolean); if (!v('question') || opts.length < 2){ toast('Add a question and at least two options'); return; }
      act('addPoll', { question: v('question'), options: opts.join('\n'), closes: v('closes'), multiple: v('multiple') }).then(done('Poll started')); f.reset(); return; }
    case 'market': if (!v('what')){ toast('Say what it is'); return; } if (v('region')) save('dash-region', v('region')); act('marketPost', { type: v('type'), what: v('what'), details: v('details'), region: v('region') }).then(done('Posted')); f.reset(); return;
    case 'story': if (!v('title') || !f.elements.namedItem('story').value.trim()){ toast('Add a title and the story'); return; } act('storyPost', { title: v('title'), when: v('when'), about: v('about'), story: f.elements.namedItem('story').value, photo: v('photo') }).then(done('Story shared – thank you')); f.reset(); return;
    case 'recipe': if (!v('name')){ toast('Add a name'); return; } act('addRecipe', { name: v('name'), from: v('from'), category: v('category'), ingredients: f.elements.namedItem('ingredients').value, steps: f.elements.namedItem('steps').value, link: v('link') }).then(done('Recipe saved')); f.reset(); return;
    case 'followup': if (!v('person')){ toast('Add who the follow-up is for'); return; } act('addFollowup', { person: v('person'), topic: v('topic'), due: v('due'), channel: v('channel'), to: v('to'), phone: v('phone'), subject: v('subject'), message: f.elements.namedItem('message').value }); f.reset(); return;
  }
});
document.addEventListener('change', ev => { const el = ev.target; if (el.dataset && el.dataset.rsvpcount && !ro()){ const g = data.gatherings.find(x => x.id === el.dataset.rsvpcount); if (g && g.mine) g.mine.count = Number(el.value); act('rsvp', { id: el.dataset.rsvpcount, answer: el.dataset.ans, count: el.value }); } });
document.addEventListener('input', ev => { if (ev.target.id === 'rsearch'){ recipeQ = ev.target.value; const q = recipeQ.trim().toLowerCase(); document.querySelectorAll('[data-rname]').forEach(r => { r.style.display = !q || r.dataset.rname.indexOf(q) >= 0 ? '' : 'none'; }); } });
document.addEventListener('input', ev => { const el = ev.target; if (el.dataset && el.dataset.ef){ const ed = editing[el.dataset.id]; if (ed) ed[el.dataset.ef] = el.value; } });

/* =========================================================
   Messages (family chat) – v3
   ========================================================= */
const chat = { open: '', msgs: [], compose: '', photo: '', q: '', results: null, sheet: null, meta: '', reply: null, flash: '', seen: [] };
const first = n => String(n || '').trim().split(/\s+/)[0];
const ymdOf = d => ymd(d);
const timeOf = iso => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase();
const chatOn = () => on('Messages') && !!data.meId;
const chatUnread = () => (data.channels || []).reduce((n, c) => n + (c.unread || 0), 0);
const AV = ['#015A84', '#2F6FB2', '#5FB4CB', '#6D3640', '#50602B', '#8D6E63'];
const initials = n => { const w = String(n || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
const avColor = (k, name) => { const p = name && (data.people || []).find(x => x.name === name); if (p && p.color) return p.color; let h = 0; for (const ch of String(k)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
function avatar(c, size){
  const st = `style="--av:${esc(avColor(c.id || c.name, c.kind ? '' : c.name))}${size ? ';--sz:' + size + 'px' : ''}"`;
  if (c.kind === 'channel') return `<span class="av ch" ${st} aria-hidden="true">#</span>`;
  if (c.kind === 'group') return `<span class="av grp" ${st} aria-hidden="true"><svg viewBox="0 0 24 24" width="55%" height="55%" fill="currentColor"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.6"/><path d="M2.5 19c.4-3.6 3.1-5.6 6.5-5.6s6.1 2 6.5 5.6z"/><path d="M15.2 13.6c2.9-.3 5.6 1.3 6.3 5.4h-4.4c-.2-2.2-.9-4-1.9-5.4z"/></svg></span>`;
  if (c.kind === 'dm'){ const other = String(c.id).split('-').slice(1).find(x => x !== data.meId), p = (data.people || []).find(x => x.id === other); return `<span class="av" style="--av:${esc(p && p.color || avColor(c.id))}${size ? ';--sz:' + size + 'px' : ''}" aria-hidden="true">${esc(initials(c.name))}</span>`; }
  return `<span class="av" ${st} aria-hidden="true">${esc(initials(c.name))}</span>`;
}
const shortWhen = iso => { if (!iso) return ''; const d = new Date(iso), day = ymdOf(d), diff = (Date.now() - d) / 864e5;
  return day === T() ? timeOf(iso) : day === plus(T(), -1) ? 'Yesterday' : diff < 6 ? d.toLocaleDateString([], { weekday: 'short' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
const SVG_READ = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12.5l4.5 4.5L15 8"/><path d="M11 16l1 1 9.5-9.5"/></svg>';
const SVG_REPLY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
const SVG_EDIT = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isOrg = () => data.me && data.me.role === 'Organizer';
/** How to @mention someone: first name, or full name when two people share it. */
function mentionLabel(p){ const f = first(p.name).toLowerCase(); return (data.people || []).filter(x => first(x.name).toLowerCase() === f).length > 1 ? p.name : first(p.name); }
function audience(c){
  const ppl = (data.people || []).filter(p => p.id && p.id !== data.meId);
  if (!c || c.kind === 'dm') return [];
  if (c.kind === 'group') return ppl.filter(p => (c.memberIds || []).indexOf(p.id) >= 0);
  return ppl.filter(p => /organi/i.test(c.who) ? p.role === 'Organizer' : true);
}
let mentRe = null, mentKey = '';
function fmtMsg(text){
  let h = esc(text); if (h.indexOf('@') < 0) return h;
  const key = (data.people || []).map(p => p.id + p.name).join('|');
  if (key !== mentKey){ mentKey = key; const labels = []; (data.people || []).forEach(p => { labels.push({ l: p.name, id: p.id }); if (mentionLabel(p) === p.name) return; labels.push({ l: first(p.name), id: p.id }); });
    labels.sort((a, b) => b.l.length - a.l.length); mentRe = labels.length ? { re: new RegExp('@(' + labels.map(x => escRe(esc(x.l))).join('|') + ')(?![\\w])', 'gi'), labels } : null; }
  if (!mentRe) return h;
  return h.replace(mentRe.re, (m, n) => { const hit = mentRe.labels.find(x => esc(x.l).toLowerCase() === n.toLowerCase()); return `<span class="ment ${hit && hit.id === data.meId ? 'mine' : ''}">${m}</span>`; });
}
function curChat(){ return (data.channels || []).find(x => x.id === chat.open); }
const canEditChat = () => { const c = curChat(); return !!c && !ro() && (c.kind === 'group' || (c.kind === 'channel' && isOrg())); };

function viewChat(){
  if (chat.open) return viewConversation();
  const ch = (data.channels || []).slice();
  const row = c => { const l = c.last, mine = l && l.from === data.me.name;
    const pre = !l ? (c.kind === 'group' ? esc(c.members.join(', ')) : 'No messages yet') : (mine ? 'You: ' : c.kind === 'dm' ? '' : esc(first(l.from)) + ': ') + esc(l.text);
    return `<button class="crow ${c.unread ? 'unread' : ''}" data-openchat="${esc(c.id)}">${avatar(c)}<span class="cbody"><span class="ctop"><b>${esc(c.name)}</b><span class="cwhen">${l ? shortWhen(l.at) : ''}</span></span><span class="cbot"><span class="cpre">${pre}</span>${c.unread ? `<span class="cn">${c.unread > 99 ? '99+' : c.unread}</span>` : ''}</span></span></button>`; };
  const q = chat.q || '', qq = esc(q.trim()), searching = q.trim().length >= 2;
  const hl = t => { const h = esc(t), i = h.toLowerCase().indexOf(qq.toLowerCase()); return i < 0 ? h : h.slice(0, i) + '<mark>' + h.slice(i, i + qq.length) + '</mark>' + h.slice(i + qq.length); };
  const res = r => `<button class="crow" data-openfind="${esc(r.channel)}|${esc(r.id)}">${avatar({ id: r.channel, name: r.name, kind: r.kind })}<span class="cbody"><span class="ctop"><b>${esc(r.name)}</b><span class="cwhen">${shortWhen(r.at)}</span></span><span class="cpre wrap"><span class="muted">${esc(first(r.from))}:</span> ${hl(r.text)}</span></span></button>`;
  const body = searching ? (chat.results ? chat.results.map(res).join('') || empty('No messages match.') : empty('Searching…'))
    : ch.map(row).join('') || empty(ro() ? 'No conversations yet.' : 'No conversations yet. Tap the pencil to start one.');
  return `<div class="chatwrap"><section class="card chatlist"><div class="chathead"><h2 class="lbl">Messages</h2>${ro() ? '' : `<button class="iconbtn" data-cnew aria-label="New message">${SVG_EDIT}</button>`}</div>
    <div class="csearch"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input type="search" data-csearch placeholder="Search messages" value="${esc(q)}" aria-label="Search messages" autocomplete="off">${q ? '<button class="cx" data-cclear aria-label="Clear search">×</button>' : ''}</div>
    <div class="clist">${body}</div></section>${pushHint()}</div>`;
}
function convName(){ const c = curChat(); if (c) return c.name; const other = chat.open.split('-').slice(1).find(x => x !== data.meId), p = (data.people || []).find(x => x.id === other); return p ? p.name : chat.dmName || 'Message'; }
function convSub(c){ if (!c) return ''; if (c.kind === 'channel') return /organi/i.test(c.who) ? 'Organizers only' : ''; if (c.kind === 'group') return c.members.map(first).join(', '); return ''; }
function viewConversation(){
  const msgs = chat.msgs || [], c = curChat() || { id: chat.open, name: convName(), kind: 'dm' }, multi = c.kind !== 'dm';
  const gap = (a, b) => Math.abs(new Date(b.at) - new Date(a.at)) / 6e4;
  const body = msgs.map((m, i) => {
    const prev = msgs[i - 1], next = msgs[i + 1], mine = m.fromId === chat.me;
    const sep = !prev || ymdOf(new Date(m.at)) !== ymdOf(new Date(prev.at)) || gap(prev, m) > 60;
    const firstR = sep || prev.fromId !== m.fromId || gap(prev, m) > 5;
    const nextSep = next && (ymdOf(new Date(next.at)) !== ymdOf(new Date(m.at)) || gap(m, next) > 60);
    const lastR = !next || nextSep || next.fromId !== m.fromId || gap(m, next) > 5;
    const pic = m.photo ? picTag(m) : m.expired ? '<div class="msg exp"><i>Photo expired</i></div>' : '';
    const real = m.id !== 'tmp', acks = m.acks || [];
    const meta = chat.meta === m.id ? `<div class="meta ${mine ? 'own' : ''}">${timeOf(m.at)}${real && !ro() ? ` · <button class="lnk" data-creply="${esc(m.id)}">Reply</button>` : ''}${real && !mine && !ro() ? ` · <button class="lnk" data-cack="${esc(m.id)}">${m.ackMine ? 'Unmark read' : 'Mark read'}</button>` : ''}${real && (mine || isOrg()) && !ro() ? ` · <button class="lnk" data-cdel="${esc(m.id)}">Delete</button>` : ''}</div>` : '';
    const quote = m.reply ? `<button type="button" class="quote" data-cjump="${esc(m.reply.id)}"><b>${esc(m.reply.from ? (m.reply.from === data.me.name ? 'You' : first(m.reply.from)) : '')}</b><span>${m.reply.photo && !m.reply.text ? '📷 Photo' : esc(m.reply.text)}</span></button>` : '';
    const ackPill = acks.length ? `<div class="ackrow ${mine ? 'own' : ''}"><button class="ackp ${m.ackMine ? 'mine' : ''}" data-cacks="${esc(m.id)}" aria-label="Read by ${esc(acks.join(', '))}">${SVG_READ}${acks.length > 1 ? `<span>${acks.length}</span>` : ''}</button></div>` : '';
    const isLastMine = mine && real && !msgs.slice(i + 1).some(x => x.id !== 'tmp');
    const seenBy = isLastMine ? (chat.seen || []).filter(x => x.at && new Date(x.at) >= new Date(m.at)).map(x => first(x.name)) : [];
    const seen = isLastMine && seenBy.length ? `<div class="seen">${!multi ? 'Seen' : 'Seen by ' + esc(seenBy.slice(0, 3).join(', ')) + (seenBy.length > 3 ? ` <button class="lnk" data-cseen>+${seenBy.length - 3}</button>` : '')}</div>` : '';
    return (sep ? `<div class="daysep"><b>${dayName(ymdOf(new Date(m.at)))}</b> ${timeOf(m.at)}</div>` : '')
      + (multi && !mine && firstR ? `<div class="from">${esc(first(m.from))}</div>` : '')
      + `<div class="mrow ${mine ? 'own' : ''} ${lastR ? 'last' : ''}">`
      + `<div class="bub ${mine ? 'own' : ''} ${firstR || m.reply ? 'first' : ''} ${lastR || acks.length ? 'last' : ''} ${m.photo && !m.reply ? 'photo' : ''} ${!real ? 'tmp' : ''} ${chat.flash === m.id ? 'flash' : ''}" data-bub="${esc(m.id)}" data-mine="${mine ? 1 : 0}">${quote}${pic}${m.text ? `<div class="msg">${fmtMsg(m.text)}</div>` : ''}</div><span class="swipeic" aria-hidden="true">${SVG_REPLY}</span></div>` + ackPill + meta + seen;
  }).join('');
  return `<div class="convo card"><div class="chatbar"><button class="iconbtn back" data-cclose aria-label="Back"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="cwho">${avatar(c, 32)}<div class="wtxt"><b>${esc(convName())}</b>${convSub(c) ? `<span>${esc(convSub(c))}</span>` : ''}</div></div>
      ${canEditChat() ? '<button class="lnk edit" data-cedit>Edit</button>' : '<span class="edit"></span>'}</div>
    <div class="msgs" id="msgs">${body || `<div class="hello">${avatar(c, 64)}<b>${esc(convName())}</b><span>${chat.loaded === chat.open ? 'No messages yet. Say hello 👋' : 'Loading…'}</span></div>`}</div>
    ${ro() ? '<div class="composer ro muted sm">You can read messages, but this sign-in is view-only.</div>' : `<div class="mentbox" id="ment" hidden></div>
    ${chat.reply ? `<div class="replybar"><span class="ri">${SVG_REPLY}</span><div><b>Replying to ${esc(chat.reply.from === data.me.name ? 'yourself' : first(chat.reply.from))}</b><span>${esc(chat.reply.text || '📷 Photo')}</span></div><button type="button" class="cx" data-cunreply aria-label="Cancel reply">×</button></div>` : ''}
    ${chat.photo ? `<div class="pv"><img src="${chat.photo}" alt="Photo to send"><button type="button" class="pvx" data-cunphoto aria-label="Remove photo">×</button></div>` : ''}
    <form class="composer" data-form="csend"><label class="picbtn" title="Add a photo" aria-label="Add a photo"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><input type="file" accept="image/*" hidden onchange="pickPhoto(this)"></label><textarea name="text" rows="1" maxlength="2000" placeholder="${chat.photo ? 'Add a caption' : 'Message'}" aria-label="Message">${esc(chat.compose)}</textarea><button class="send" aria-label="Send"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5.5 11.5L12 5l6.5 6.5"/></svg></button></form>`}</div>`;
}
/* ----- the pop-up sheets: new message / group / channel, edit ----- */
function chatSheet(){
  const k = chat.sheet; if (!k) return '';
  const people = (data.people || []).filter(p => p.id && p.id !== data.meId), c = curChat();
  const head = t => `<div class="shead"><b>${t}</b><button class="btn sm" data-csheetx>Close</button></div>`;
  const pick = ids => `<div class="plist">${people.map(p => `<label class="prow"><input type="checkbox" name="m" value="${esc(p.id)}" ${ids && ids.indexOf(p.id) >= 0 ? 'checked' : ''}> ${avatar({ id: p.id, name: p.name }, 28)} ${esc(p.name)}</label>`).join('')}</div>`;
  let inner;
  if (k === 'new') inner = head('New message') + `<div class="plist"><button class="prow" data-cnewgroup><span class="av grp" style="--av:var(--accent);--sz:28px" aria-hidden="true">+</span> <b>New group</b></button>${isOrg() ? '<button class="prow" data-cnewchannel><span class="av ch" style="--sz:28px" aria-hidden="true">#</span> <b>New channel</b></button>' : ''}</div>
      <div class="lbl" style="padding:10px 2px 4px">People</div><div class="plist">${people.map(p => `<button class="prow" data-cdm="${esc(p.id)}" data-cdmname="${esc(p.name)}">${avatar({ id: p.id, name: p.name }, 28)} ${esc(p.name)}${p.household && p.household !== p.name ? ` <span class="muted sm">${esc(p.household)}</span>` : ''}</button>`).join('')}</div>`;
  else if (k === 'group') inner = head('New group') + `<form data-form="cgroup"><label class="f">Name</label><input class="f-in" name="name" maxlength="40" placeholder="e.g. Reunion planning">${pick([])}<div class="bar" style="border:none;padding:10px 0 0;justify-content:flex-end"><button class="btn go">Create</button></div></form>`;
  else if (k === 'channel') inner = head('New channel') + `<form data-form="cchannel"><label class="f">Name</label><input class="f-in" name="name" maxlength="40" placeholder="e.g. Cousins"><label class="f">Who sees it</label><select class="f-in" name="who"><option>Everyone</option><option>Organizers</option></select><div class="bar" style="border:none;padding:10px 0 0;justify-content:flex-end"><button class="btn go">Create</button></div></form>`;
  else if (k === 'edit' && c) inner = head(c.kind === 'group' ? 'Edit group' : 'Edit channel') + `<form data-form="cedit"><label class="f">Name</label><input class="f-in" name="name" maxlength="40" value="${esc(c.name)}">${c.kind === 'group' ? pick(c.memberIds || []) : `<label class="f">Who sees it</label><select class="f-in" name="who">${['Everyone', 'Organizers'].map(o => `<option ${(/organi/i.test(c.who) ? 'Organizers' : 'Everyone') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`}<div class="bar" style="border:none;padding:10px 0 0;justify-content:flex-end"><button class="btn go">Save</button></div></form>`;
  else return '';
  return `<div class="csheet" role="dialog" aria-modal="true"><div class="csheet-in card">${inner}</div></div>`;
}
function renderSheet(){ let el = document.getElementById('csheet'); if (!el){ el = document.createElement('div'); el.id = 'csheet'; document.body.appendChild(el); } el.innerHTML = data && tab === 'chat' ? chatSheet() : ''; }

/* ----- talking to the server ----- */
async function openChat(id, name, text, photo, opt){
  if (chat.open !== id){ chat.msgs = []; chat.loaded = ''; chat.reply = null; chat.meta = ''; }
  chat.open = id; chat.dmName = name || chat.dmName; tab = 'chat'; save('dash-tab', tab);
  render(); scrollChat();
  try {
    const r = await runFn('chat', KEY, id, text === undefined ? null : text, photo || null, opt || {});
    if (photo){ const mineP = r.messages.filter(m => m.fromId === r.me && m.photo).pop(); if (mineP && !picCache[mineP.id]){ picCache[mineP.id] = photo; idbPut(mineP.id, photo); } }
    if (chat.open !== id) return;
    chat.msgs = r.messages; chat.seen = r.seen || []; chat.me = r.me; chat.loaded = id; data.channels = r.channels; save('dash-cache', JSON.stringify(data));
    const near = isNearBottom(); render(); if (opt && opt.find) jumpTo(opt.find); else if (near || text !== undefined) scrollChat();
  } catch (e) {
    const m = String(e && e.message || e).replace(/^(Error|Exception):\s*/, '');
    if (/unauthorized|expired/.test(m)){ stopChat(); refresh(); return; }
    if (text !== undefined){ chat.compose = text || ''; if (photo) chat.photo = photo; if (opt && opt.reply) chat.reply = opt.reply; chat.msgs = (chat.msgs || []).filter(x => x.id !== 'tmp'); toast('Not sent: ' + m); render(); }
    else if (!chat.loaded){ toast(m); }
  }
  clearTimeout(chat.timer); chat.timer = setTimeout(() => { if (chat.open === id && tab === 'chat' && !document.hidden) openChat(id); }, 7000);
}
function stopChat(){ clearTimeout(chat.timer); chat.open = ''; chat.reply = null; chat.meta = ''; chat.flash = ''; chat.sheet = null; }
function jumpTo(id){ const el = document.querySelector(`[data-bub="${CSS.escape(id)}"]`);
  if (!el){ if (chat.open) openChat(chat.open, null, undefined, undefined, { find: id }); return; }
  chat.flash = id; el.classList.add('flash'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => { if (chat.flash === id) chat.flash = ''; el.classList.remove('flash'); }, 1600); }
function toggleAck(id){ const m = (chat.msgs || []).find(x => x.id === id); if (!m || m.fromId === chat.me || ro()) return;
  m.ackMine = m.ackMine ? 0 : 1; m.acks = (m.acks || []).filter(n => n !== data.me.name).concat(m.ackMine ? [data.me.name] : []);
  chat.meta = ''; render(); if (navigator.vibrate) try { navigator.vibrate(12); } catch (_) {}
  openChat(chat.open, null, undefined, undefined, { ack: id }); }
function startReply(id){ const m = (chat.msgs || []).find(x => x.id === id); if (!m || ro()) return;
  chat.reply = { id: m.id, from: m.from, text: m.text ? m.text.slice(0, 90) : '' }; chat.meta = ''; render(); const t = $('.composer textarea'); if (t) t.focus(); }
let searchT = 0, searchN = 0;
function keepSearch(fn){ const a = document.activeElement, keep = a && a.dataset && a.dataset.csearch !== undefined, pos = keep ? a.selectionStart : 0; fn(); if (keep){ const el = $('[data-csearch]'); if (el){ el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} } } }
function runSearch(){ const q = (chat.q || '').trim(); clearTimeout(searchT); chat.results = null; if (q.length < 2) return;
  const n = ++searchN; searchT = setTimeout(() => runFn('chatSearch', KEY, q).then(r => { if (n !== searchN || tab !== 'chat' || chat.open) return; chat.results = r.results; keepSearch(render); }).catch(e => { if (n === searchN){ chat.results = []; toast(String(e.message || e)); keepSearch(render); } }), 350); }
const isNearBottom = () => { const m = $('#msgs'); return !m || m.scrollHeight - m.scrollTop - m.clientHeight < 80; };
const scrollChat = () => { const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight; };

/* ----- photos: shrunk on the phone before sending, cached on each device after the first load ----- */
const picCache = {}, picLoading = {};
let picQueue = [], picActive = 0;
const idb = (() => { let p = null; return () => p || (p = new Promise((res, rej) => { const q = indexedDB.open('dash-photos', 1); q.onupgradeneeded = () => q.result.createObjectStore('p'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); })); })();
async function idbGet(k){ try { const db = await idb(); return await new Promise(res => { const q = db.transaction('p').objectStore('p').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (_) { return null; } }
async function idbPut(k, v){ try { const db = await idb(); db.transaction('p', 'readwrite').objectStore('p').put(v, k); } catch (_) {} }
function picTag(m){
  const src = m.local || picCache[m.id];
  if (!src && m.id !== 'tmp') loadPic(m.id);
  return `<button type="button" class="pic ${src ? '' : 'loading'}" data-cpic="${esc(m.id)}" aria-label="Open photo">${src ? `<img src="${src}" alt="Photo from ${esc(m.from)}">` : '<span>Loading photo…</span>'}</button>`;
}
function showPic(id, src){ document.querySelectorAll(`[data-cpic="${CSS.escape(id)}"]`).forEach(b => { const near = isNearBottom(); b.classList.remove('loading'); b.innerHTML = `<img src="${src}" alt="Photo">`; const img = b.querySelector('img'); if (near && img) img.onload = scrollChat; }); }
function loadPic(id){ if (picLoading[id] || picCache[id]) return; picLoading[id] = 1; idbGet(id).then(hit => { if (hit){ picCache[id] = hit; showPic(id, hit); return; } picQueue.push(id); pumpPics(); }); }
function pumpPics(){
  while (picActive < 2 && picQueue.length){
    const id = picQueue.shift(); picActive++;
    runFn('chatPhoto', KEY, id).then(r => { const src = 'data:' + r.mime + ';base64,' + r.data; picCache[id] = src; idbPut(id, src); showPic(id, src); })
      .catch(e => { delete picLoading[id]; document.querySelectorAll(`[data-cpic="${CSS.escape(id)}"] span`).forEach(x => { x.textContent = /expired|gone/i.test(String(e.message)) ? 'Photo expired' : 'Couldn\'t load – tap to retry'; }); })
      .finally(() => { picActive--; pumpPics(); });
  }
}
function shrinkPhoto(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That photo couldn\'t be opened – try a JPEG or PNG')); };
    img.src = url;
  });
}
function zoomPic(src){
  const box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Photo');
  box.innerHTML = `<img src="${src}" alt="Photo"><button type="button" class="btn sm">Close</button>`;
  box.addEventListener('click', () => box.remove()); document.addEventListener('keydown', function k(e){ if (e.key === 'Escape'){ box.remove(); document.removeEventListener('keydown', k); } });
  document.body.appendChild(box);
}
// The handler sits on the input itself: the chat redraws every few seconds and swaps the input out.
async function pickPhoto(inp){
  if (!inp || !inp.files || !inp.files[0]) return;
  const file = inp.files[0]; inp.value = '';
  const t = $('.composer textarea'); if (t) chat.compose = t.value;
  try { chat.photo = await shrinkPhoto(file); render(); const t2 = $('.composer textarea'); if (t2) t2.focus(); scrollChat(); } catch (err) { toast(err.message); }
}
window.pickPhoto = pickPhoto;

/* ----- taps, swipes, typing ----- */
document.addEventListener('click', ev => {
  if (!data) return;
  if (Date.now() - noTap < 500 && ev.target.closest('[data-bub]')) return;
  const bub = ev.target.closest('[data-bub]');
  if (bub && !ev.target.closest('button')){ chat.meta = chat.meta === bub.dataset.bub ? '' : bub.dataset.bub; const near = isNearBottom(); render(); if (near) scrollChat(); return; }
  if (ev.target.classList && ev.target.classList.contains('csheet')){ chat.sheet = null; renderSheet(); return; }
  const b = ev.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.openchat){ openChat(d.openchat); return; }
  if ('cclose' in d){ stopChat(); render(); window.scrollTo(0, 0); return; }
  if ('cnew' in d){ chat.sheet = 'new'; renderSheet(); return; }
  if ('cnewgroup' in d){ chat.sheet = 'group'; renderSheet(); return; }
  if ('cnewchannel' in d){ chat.sheet = 'channel'; renderSheet(); return; }
  if ('cedit' in d){ chat.sheet = 'edit'; renderSheet(); return; }
  if ('csheetx' in d){ chat.sheet = null; renderSheet(); return; }
  if (d.cdm){ chat.sheet = null; renderSheet(); openChat('dm-' + [data.meId, d.cdm].sort().join('-'), d.cdmname); return; }
  if (d.creply){ startReply(d.creply); return; }
  if ('cunreply' in d){ chat.reply = null; render(); return; }
  if (d.cack){ toggleAck(d.cack); return; }
  if (d.cacks){ const m = (chat.msgs || []).find(x => x.id === d.cacks); if (m) toast('Read by ' + (m.acks || []).map(n => n === data.me.name ? 'you' : first(n)).join(', ')); return; }
  if ('cseen' in d){ const last = (chat.msgs || []).filter(m => m.fromId === chat.me).pop(); toast('Seen by ' + (chat.seen || []).filter(x => last && new Date(x.at) >= new Date(last.at)).map(x => first(x.name)).join(', ')); return; }
  if (d.cjump){ jumpTo(d.cjump); return; }
  if (d.openfind){ const [c, id] = d.openfind.split('|'); openChat(c, null, undefined, undefined, { find: id }); return; }
  if ('cclear' in d){ chat.q = ''; chat.results = null; render(); const el = $('[data-csearch]'); if (el) el.focus(); return; }
  if (d.cment){ const t = $('.composer textarea'); if (t){ const pos = t.selectionStart, before = t.value.slice(0, pos).replace(/@[\w]*$/, '@' + d.cment + ' '); t.value = before + t.value.slice(pos); t.focus(); t.setSelectionRange(before.length, before.length); } $('#ment').hidden = true; return; }
  if (d.cpic){ const m = (chat.msgs || []).find(x => x.id === d.cpic), src = (m && m.local) || picCache[d.cpic]; if (src) zoomPic(src); else { delete picLoading[d.cpic]; loadPic(d.cpic); } return; }
  if ('cunphoto' in d){ const t = $('.composer textarea'); if (t) chat.compose = t.value; chat.photo = ''; render(); return; }
  if (d.cdel){ if (!confirm('Delete this message?')) return; chat.msgs = chat.msgs.filter(m => m.id !== d.cdel); chat.meta = ''; render(); act('deleteMessage', { id: d.cdel }).then(() => { if (chat.open) openChat(chat.open); }); return; }
});
document.addEventListener('submit', ev => {
  const f = ev.target.closest('form[data-form]'); if (!f || !/^c(send|group|channel|edit)$/.test(f.dataset.form)) return;
  ev.preventDefault();
  const kind = f.dataset.form, val = n => { const el = f.elements.namedItem(n); return el ? el.value.trim() : ''; }, picked = () => [...f.querySelectorAll('input[name=m]:checked')].map(x => x.value);
  if (kind === 'csend'){
    const t = f.querySelector('textarea'), text = t.value.trim(), photo = chat.photo; if (!text && !photo) return; t.value = '';
    const reply = chat.reply; chat.reply = null; const mb = $('#ment'); if (mb) mb.hidden = true;
    chat.compose = ''; chat.photo = ''; chat.msgs = (chat.msgs || []).concat({ id: 'tmp', fromId: chat.me || data.meId, from: data.me.name, at: new Date().toISOString(), text, photo: photo ? 1 : 0, local: photo, reply: reply ? { id: reply.id, from: reply.from, text: reply.text } : null });
    render(); scrollChat(); const t2 = $('.composer textarea'); if (t2){ t2.focus(); t2.style.height = ''; }
    openChat(chat.open, null, text, photo || undefined, reply ? { replyTo: reply.id, reply } : undefined); return;
  }
  if (!val('name')){ toast('Give it a name'); return; }
  if (kind === 'cgroup'){ const m = picked(); if (!m.length){ toast('Pick at least one other person'); return; } chat.sheet = null; renderSheet(); act('newChannel', { kind: 'group', name: val('name'), members: m.join(',') }).then(() => { if (!lastErr) toast('Group made'); }); return; }
  if (kind === 'cchannel'){ chat.sheet = null; renderSheet(); act('newChannel', { kind: 'channel', name: val('name'), who: val('who') }).then(() => { if (!lastErr) toast('Channel made'); }); return; }
  if (kind === 'cedit'){ const c = curChat(); if (!c) return; const p = { id: c.id, name: val('name') };
    if (c.kind === 'group'){ const m = picked(); if (!m.length){ toast('Pick at least one other person'); return; } p.members = m.concat(data.meId).join(','); } else p.who = val('who');
    c.name = p.name; chat.sheet = null; renderSheet(); render(); act('editChannel', p).then(() => { if (!lastErr) toast('Saved'); }); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && e.target.closest && e.target.closest('.composer') && e.target.tagName === 'TEXTAREA' && window.matchMedia('(hover:hover)').matches){ e.preventDefault(); const f = e.target.closest('form'); if (f) f.requestSubmit(); } });
let tch = null, noTap = 0;
document.addEventListener('touchstart', e => { const b = e.target.closest && e.target.closest('[data-bub]'); if (!b || ro() || b.dataset.bub === 'tmp' || e.touches.length > 1) { tch = null; return; }
  const t = e.touches[0]; tch = { b, row: b.closest('.mrow'), x: t.clientX, y: t.clientY, dx: 0, h: false };
  if (b.dataset.mine !== '1') tch.lp = setTimeout(() => { if (tch && !tch.h){ noTap = Date.now(); const id = b.dataset.bub; tch = null; toggleAck(id); } }, 450); }, { passive: true });
document.addEventListener('touchmove', e => { if (!tch) return; const t = e.touches[0], dx = t.clientX - tch.x, dy = t.clientY - tch.y;
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimeout(tch.lp);
  if (!tch.h && Math.abs(dy) > Math.abs(dx)) { if (Math.abs(dy) > 8) tch = null; return; }
  if (dx > 6) { tch.h = true; tch.dx = Math.min(dx, 80); tch.row.style.transform = `translateX(${tch.dx}px)`; tch.row.classList.toggle('armed', tch.dx > 55); } }, { passive: true });
document.addEventListener('touchend', () => { if (!tch) return; clearTimeout(tch.lp); const { row, dx, b } = tch; tch = null;
  if (row){ row.style.transition = 'transform .18s'; row.style.transform = ''; row.classList.remove('armed'); setTimeout(() => { row.style.transition = ''; }, 200); }
  if (dx > 55){ noTap = Date.now(); if (navigator.vibrate) try { navigator.vibrate(10); } catch (_) {} startReply(b.dataset.bub); } }, { passive: true });
document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('[data-bub]')) e.preventDefault(); });
document.addEventListener('dblclick', e => { const b = e.target.closest && e.target.closest('[data-bub]'); if (b && b.dataset.mine !== '1' && b.dataset.bub !== 'tmp' && !('ontouchstart' in window)) { e.preventDefault(); toggleAck(b.dataset.bub); } });
document.addEventListener('input', e => { const t = e.target;
  if (t.dataset && t.dataset.csearch !== undefined){ chat.q = t.value; runSearch(); keepSearch(render); return; }
  if (t.tagName === 'TEXTAREA' && t.closest && t.closest('.composer')){
    t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px';
    const box = $('#ment'); if (!box) return;
    const m = t.value.slice(0, t.selectionStart).match(/(?:^|\s)@([\w]*)$/), ppl = m ? audience(curChat()).filter(p => !m[1] || p.name.toLowerCase().split(' ').some(w => w.indexOf(m[1].toLowerCase()) === 0)).slice(0, 6) : [];
    box.hidden = !ppl.length; box.innerHTML = ppl.map(p => `<button type="button" data-cment="${esc(mentionLabel(p))}">${avatar({ id: p.id, name: p.name }, 24)}${esc(p.name)}</button>`).join(''); } });
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#ment')) e.preventDefault(); });

/* =========================================================
   Phone notifications (only in the installed phone app)
   ========================================================= */
const inPWA = () => !!window.FAMILY_API;
const pushOK = () => inPWA() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const deviceKind = () => /iphone/i.test(navigator.userAgent) ? 'iPhone' : /ipad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad' : /android/i.test(navigator.userAgent) ? 'phone' : 'computer';
const deviceName = () => { const ua = navigator.userAgent; return (/iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : 'Device') + ' · ' + (/edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser') + (standalone() ? ' app' : ''); };
const b64u8 = b => { b = String(b).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return Uint8Array.from(atob(b), c => c.charCodeAt(0)); };
let pushSub = null, pushChecked = false;
const pushOn = () => !!(pushSub && pushOK() && Notification.permission === 'granted');
async function pushCheck(){
  if (pushChecked || !pushOK() || !data || !data.push) return; pushChecked = true;
  try {
    const reg = await navigator.serviceWorker.getRegistration(); pushSub = reg ? await reg.pushManager.getSubscription() : null;
    if (pushSub && data.push.ready && Notification.permission === 'granted' && (data.push.devices || []).indexOf(pushSub.endpoint) < 0) act('pushSub', { sub: JSON.stringify(pushSub), device: deviceName() });
    if (tab === 'view' || tab === 'chat') render();
  } catch (_) {}
}
async function pushTurnOn(){
  if (!pushOK()){ toast('This browser can\'t get notifications'); return; }
  const perm = await Notification.requestPermission();   // first thing in the tap, so the browser allows the prompt
  if (perm !== 'granted'){ toast(perm === 'denied' ? 'Notifications are blocked – allow them in Settings for this app' : 'Notifications not turned on'); render(); return; }
  try {
    const reg = await navigator.serviceWorker.ready, key = b64u8(data.push.key);
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey){ const old = new Uint8Array(sub.options.applicationServerKey); if (old.length !== key.length || old.some((x, i) => x !== key[i])){ await sub.unsubscribe(); sub = null; } }
    sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    pushSub = sub; render();
    await act('pushSub', { sub: JSON.stringify(sub), device: deviceName() }); if (!lastErr) toast('Notifications on');
  } catch (e) { toast('Couldn\'t turn on notifications: ' + (e.message || e)); }
}
async function pushTurnOff(){
  const sub = pushSub; pushSub = null; render();
  if (sub){ act('pushUnsub', { endpoint: sub.endpoint }); try { await sub.unsubscribe(); } catch (_) {} }
  toast('Notifications off on this ' + deviceKind());
}
/** A small nudge on the Messages screen when notifications are possible but off. */
function pushHint(){
  const P = data.push || {}; if (!P.ready || ro()) return '';
  if (!inPWA()) return data.phoneApp ? `<p class="muted sm" style="text-align:center">Want a notification when someone writes? <a href="${esc(data.phoneApp)}" target="_blank" rel="noopener">Install the phone app</a>.</p>` : '';
  if (pushOn()) return '';
  return `<p class="muted sm" style="text-align:center">Get a notification when someone writes. <button class="lnk" data-go="view">Turn on notifications</button></p>`;
}
function notifCard(){
  const P = data.push || {}, pr = P.prefs || {}, on = pushOn();
  if (!P.ready) return '';
  let top;
  if (!inPWA()) top = `<div class="row"><span class="txt">Notifications work in the phone app.${data.phoneApp ? ` <a href="${esc(data.phoneApp)}" target="_blank" rel="noopener">Open it</a>, then add it to your Home Screen.` : ''}</span></div>`;
  else if (isIOS() && !standalone()) top = `<div class="row"><span class="txt"><b>First, add the app to your Home Screen</b><div class="muted sm">iPhones only send notifications to apps on the Home Screen. Tap Share <b>⎋</b> in Safari › <b>Add to Home Screen</b> › <b>Add</b>. Then open it from your Home Screen and come back here.</div></span></div>`;
  else if (!pushOK()) top = `<div class="row"><span class="txt">This browser can't get notifications. On iPhone you need iOS 16.4 or newer.</span></div>`;
  else if (Notification.permission === 'denied') top = `<div class="row"><span class="txt"><b>Notifications are blocked</b><div class="muted sm">${isIOS() ? 'Open iPhone Settings › Notifications › this app and allow them, then come back.' : 'Allow notifications for this site in the browser\'s site settings, then reload.'}</div></span></div>`;
  else top = on ? `<div class="row" style="align-items:center"><span class="txt"><b>On for this ${deviceKind()}</b><div class="muted sm">${esc(deviceName())}</div></span><button class="btn sm" data-pushtest>Send a test</button><button class="btn sm" data-pushoff>Turn off</button></div>`
    : `<div class="row" style="align-items:center"><span class="txt"><b>Off on this ${deviceKind()}</b><div class="muted sm">Get a notification for new messages, even when the app is closed.</div></span><button class="btn go" data-pushon>Turn on</button></div>`;
  const msg = pr.msg || 'all';
  return card('Notifications', top + `<div class="row" style="align-items:center;flex-wrap:wrap"><span class="txt">Messages<div class="muted sm">"Direct only" = private messages, groups and @mentions of you</div></span><span class="seg">${[['all', 'All'], ['direct', 'Direct only'], ['off', 'Off']].map(([k, l]) => `<button data-pushpref="${k}" aria-pressed="${msg === k}">${l}</button>`).join('')}</span></div>`);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b || !data) return; const d = b.dataset;
  if ('pushon' in d){ pushTurnOn(); return; }
  if ('pushoff' in d){ pushTurnOff(); return; }
  if ('pushtest' in d){ act('pushTest', {}).then(() => { if (!lastErr) toast('Test sent'); }); return; }
  if (d.pushpref){ data.push.prefs = Object.assign({}, data.push.prefs, { msg: d.pushpref }); render(); act('pushPrefs', { msg: d.pushpref }); return; }
});
/** Open the screen a notification (or a ?go= link) points at. */
function goTo(go){
  go = String(go || ''); if (!go || !data) return;
  const [where, arg] = go.split(':');
  if (where === 'chat' && chatOn()){ menuOpen = false; if (arg) openChat(arg); else { stopChat(); tab = 'chat'; save('dash-tab', tab); render(); } return; }
  if (where === 'view'){ tab = 'view'; render(); }
}
if ('serviceWorker' in navigator && inPWA()) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.go !== undefined) goTo(e.data.go); });

/* =========================================================
   Start
   ========================================================= */
const typing = () => { const a = document.activeElement; return isEditing() || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.value); };
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && menuOpen){ menuOpen = false; render(); $('#menubtn').focus(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !typing() && !pendingActs) refresh(); });
setInterval(() => { if (!document.hidden && !typing() && !pendingActs) refresh(); }, 2 * 60 * 1000);
setInterval(() => { if (!typing() && data) render(); }, 60 * 1000);
function readKeyFromLink(){
  if (window.FAMILY_API) return Promise.resolve(location.hash.replace(/^#/, ''));
  return new Promise(res => {
    const t = setTimeout(() => res(''), 3000);                       // never wait more than 3 s for the link
    try { google.script.url.getLocation(loc => { clearTimeout(t); res(((loc && loc.hash) || '').replace(/^#/, '')); }); }
    catch(_) { clearTimeout(t); res(window.__hash || ''); }
  });
}
function step(msg){ if (!data) { const m = $('#main'); if (m) m.innerHTML = `<div class="empty">Loading… <span class="sm">(${msg})</span></div>`; } }
window.addEventListener('unhandledrejection', e => { if (!data) { lastErr = 'mismatch'; lastMsg = String(e.reason && e.reason.message || e.reason); try { render(); } catch(_){} } });
window.addEventListener('error', e => { if (!data) $('#main').innerHTML = `<section class="card" style="max-width:560px;margin:0 auto"><h2 class="lbl">The page hit an error</h2><div style="padding:12px 14px">${esc(e.message || e)}</div><div class="bar"><button class="btn go" onclick="location.reload()">Reload</button></div></section>`; });
let pendingGo = (() => { try { const g = new URLSearchParams(location.search).get('go') || ''; if (g && window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.hash); return g; } catch (_) { return ''; } })();
(async () => {
  step('reading your link');
  const k = await readKeyFromLink();
  if (k && k !== KEY && !/^S\./.test(KEY)){ KEY = k; save('dash-key', k); try { localStorage.removeItem('dash-cache'); } catch(_){} }
  if (KEY){ try { const c = load('dash-cache'); if (c) data = JSON.parse(c); } catch(_){} }
  render(); if (!data && KEY) step('asking Google – the first load can take up to 45 seconds'); refresh();
})();
