/* ─────────────────────────────────────────────
   calendar.js — Calendar screen
   ───────────────────────────────────────────── */

import DB from './db.js';
import { AppState, openModal, closeModal } from './app.js';
import { uid, todayStr, toDateStr, weekStart, addDays, weekDates,
         formatDate, formatTime, escHtml } from './utils.js';

let calView  = 'week';
let calDate  = new Date();
let calActiveFilters = null; // null = all members

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

export function renderCalendar(container) {
  const members = DB.getMembers().filter(m => m.is_active);
  if (!calActiveFilters) calActiveFilters = new Set(members.map(m => m.id));

  container.innerHTML = buildCalendarShell(members);
  wireCalendar(container);
  renderCalBody(container);
}

/* ── Shell HTML ───────────────────────────── */
function buildCalendarShell(members) {
  return `
    <!-- Toolbar -->
    <div class="cal-toolbar">
      <div class="cal-view-tabs" role="tablist">
        ${['week','day','month','schedule'].map(v => `
          <button class="cal-view-tab${calView === v ? ' active' : ''}" data-view="${v}" role="tab">
            ${v.charAt(0).toUpperCase() + v.slice(1)}
          </button>`).join('')}
      </div>
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev" aria-label="Previous">◀</button>
        <span class="cal-nav-label" id="cal-label"></span>
        <button class="cal-nav-btn" id="cal-today">Today</button>
        <button class="cal-nav-btn" id="cal-next" aria-label="Next">▶</button>
      </div>
    </div>

    <!-- Member filters -->
    <div class="cal-member-filters" style="padding:6px 14px;gap:6px;display:flex;flex-wrap:wrap;flex-shrink:0">
      ${members.map(m => `
        <button class="cal-member-filter${calActiveFilters.has(m.id) ? ' active' : ''}"
                data-member-id="${m.id}"
                style="--member-color:${m.colour_hex}">
          ${m.icon} ${m.display_name}
        </button>`).join('')}
    </div>

    <!-- Calendar body -->
    <div class="cal-body" id="cal-body" style="flex:1;overflow:hidden;position:relative"></div>

    <!-- Add event FAB -->
    <button class="fab" id="cal-add" aria-label="Add event" title="Add event">＋</button>
  `;
}

/* ── Wiring ───────────────────────────────── */
function wireCalendar(container) {
  // View tabs
  container.querySelectorAll('.cal-view-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      calView = btn.dataset.view;
      container.querySelectorAll('.cal-view-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderCalBody(container);
    });
  });

  // Nav
  container.querySelector('#cal-prev').addEventListener('click', () => { shiftDate(-1); renderCalBody(container); });
  container.querySelector('#cal-next').addEventListener('click', () => { shiftDate(1); renderCalBody(container); });
  container.querySelector('#cal-today').addEventListener('click', () => { calDate = new Date(); renderCalBody(container); });

  // Member filters
  container.querySelectorAll('.cal-member-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.memberId;
      if (calActiveFilters.has(id)) calActiveFilters.delete(id);
      else calActiveFilters.add(id);
      btn.classList.toggle('active', calActiveFilters.has(id));
      renderCalBody(container);
    });
  });

  // Add event
  container.querySelector('#cal-add').addEventListener('click', () => openAddEventModal());
}

function shiftDate(delta) {
  const d = new Date(calDate);
  if (calView === 'week')  d.setDate(d.getDate() + delta * 7);
  if (calView === 'day')   d.setDate(d.getDate() + delta);
  if (calView === 'month') d.setMonth(d.getMonth() + delta);
  if (calView === 'schedule') d.setDate(d.getDate() + delta * 14);
  calDate = d;
}

/* ── Body render dispatcher ───────────────── */
function renderCalBody(container) {
  const body = container.querySelector('#cal-body');
  const label = container.querySelector('#cal-label');

  if (calView === 'week')     { renderWeekView(body, label); }
  else if (calView === 'day') { renderDayView(body, label); }
  else if (calView === 'month') { renderMonthView(body, label); }
  else { renderScheduleView(body, label); }
}

/* ── Week view ────────────────────────────── */
function renderWeekView(body, label) {
  const dates = weekDates(calDate);
  const today = todayStr();
  label.textContent = `${formatDate(dates[0], 'short')} – ${formatDate(dates[6], 'medium')}`;

  const allEvents = getFilteredEvents(dates[0], dates[6]);

  body.innerHTML = `
    <div class="cal-week" style="height:100%">
      <div class="cal-week-time-col">
        ${HOURS.map(h => `<div class="cal-time-label">${formatHour(h)}</div>`).join('')}
      </div>
      <div class="cal-week-days" style="flex:1;display:grid;grid-template-columns:repeat(7,1fr);overflow-y:auto;overflow-x:hidden">
        ${dates.map(dateStr => {
          const dayEvents = allEvents.filter(e => e.starts_at.slice(0,10) === dateStr);
          const isToday = dateStr === today;
          const d = new Date(dateStr + 'T00:00:00');
          return `
            <div class="cal-day-col">
              <div class="cal-day-header${isToday ? ' today' : ''}">
                <span class="day-name">${formatDate(d, 'day')}</span>
                <span class="day-num">${d.getDate()}</span>
              </div>
              <div class="cal-day-slots" style="position:relative;height:${HOURS.length * 60}px">
                ${HOURS.map(() => `<div class="cal-hour-slot"></div>`).join('')}
                ${dayEvents.map(ev => renderCalEvent(ev)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;

  // Wire event clicks
  body.querySelectorAll('.cal-event').forEach(el => {
    el.addEventListener('click', () => {
      const ev = DB.getEvents().find(e => e.id === el.dataset.eventId);
      if (ev) openEventDetailModal(ev);
    });
  });
}

/* ── Day view ─────────────────────────────── */
function renderDayView(body, label) {
  const dateStr = toDateStr(calDate);
  const today   = todayStr();
  label.textContent = formatDate(calDate, 'long');

  const allEvents = getFilteredEvents(dateStr, dateStr);

  body.innerHTML = `
    <div style="display:flex;height:100%;overflow-y:auto">
      <div style="width:50px;flex-shrink:0;border-right:1px solid var(--border);padding-top:40px">
        ${HOURS.map(h => `<div class="cal-time-label">${formatHour(h)}</div>`).join('')}
      </div>
      <div style="flex:1;position:relative">
        <div class="cal-day-header${dateStr === today ? ' today' : ''}" style="height:40px;display:flex;align-items:center;padding:0 12px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface);z-index:2">
          <span style="font-size:16px;font-weight:700">${formatDate(calDate, 'long')}</span>
        </div>
        <div style="position:relative;height:${HOURS.length * 60}px">
          ${HOURS.map(() => `<div class="cal-hour-slot"></div>`).join('')}
          ${allEvents.map(ev => renderCalEvent(ev, true)).join('')}
        </div>
      </div>
    </div>`;

  body.querySelectorAll('.cal-event').forEach(el => {
    el.addEventListener('click', () => {
      const ev = DB.getEvents().find(e => e.id === el.dataset.eventId);
      if (ev) openEventDetailModal(ev);
    });
  });
}

/* ── Month view ───────────────────────────── */
function renderMonthView(body, label) {
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  label.textContent = `${['January','February','March','April','May','June','July','August','September','October','November','December'][month]} ${year}`;

  const today = todayStr();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  // Fill grid from Monday before month start
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon
  const cells = [];
  for (let i = -startOffset; i <= lastDay.getDate() - 1 + (6 - (lastDay.getDay() + 6) % 7); i++) {
    const d = new Date(year, month, 1 + i);
    cells.push(d);
  }

  const allEvents = getFilteredEvents(toDateStr(cells[0]), toDateStr(cells[cells.length - 1]));

  body.innerHTML = `
    <div class="cal-month" style="height:100%;display:flex;flex-direction:column">
      <div class="cal-month-header">
        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
          `<div class="cal-month-day-name">${d}</div>`).join('')}
      </div>
      <div class="cal-month-grid" style="flex:1;display:grid;grid-template-columns:repeat(7,1fr);overflow:hidden">
        ${cells.map(d => {
          const ds = toDateStr(d);
          const isCurrentMonth = d.getMonth() === month;
          const isToday = ds === today;
          const evs = allEvents.filter(e => e.starts_at.slice(0,10) === ds).slice(0, 3);
          return `
            <div class="cal-month-cell${!isCurrentMonth ? ' other-month' : ''}${isToday ? ' today' : ''}">
              <div class="cell-num">${d.getDate()}</div>
              ${evs.map(ev => {
                const m = DB.getMember((ev.member_ids||[])[0]);
                const color = m?.colour_hex || '#8b949e';
                return `<div style="font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                              border-left:3px solid ${color};padding:1px 3px;border-radius:2px;
                              background:${color}22;margin-bottom:1px;cursor:pointer"
                             data-event-id="${ev.id}">${escHtml(ev.title)}</div>`;
              }).join('')}
            </div>`;
        }).join('')}
      </div>
    </div>`;

  body.querySelectorAll('[data-event-id]').forEach(el => {
    el.addEventListener('click', () => {
      const ev = DB.getEvents().find(e => e.id === el.dataset.eventId);
      if (ev) openEventDetailModal(ev);
    });
  });
}

/* ── Schedule view ────────────────────────── */
function renderScheduleView(body, label) {
  const start  = new Date(calDate);
  const end    = addDays(start, 13);
  const startStr = toDateStr(start);
  const endStr   = toDateStr(end);
  label.textContent = `${formatDate(start, 'short')} – ${formatDate(end, 'medium')}`;

  const today   = todayStr();
  const allEvs  = getFilteredEvents(startStr, endStr)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Group by date
  const byDate = {};
  allEvs.forEach(ev => {
    const d = ev.starts_at.slice(0, 10);
    (byDate[d] = byDate[d] || []).push(ev);
  });

  const dates = [];
  for (let i = 0; i < 14; i++) dates.push(toDateStr(addDays(start, i)));

  body.innerHTML = `
    <div class="cal-schedule">
      ${dates.map(ds => {
        const evs = byDate[ds] || [];
        const d = new Date(ds + 'T00:00:00');
        const isToday = ds === today;
        return `
          <div class="schedule-group">
            <div class="schedule-group-date${isToday ? ' active' : ''}"
                 style="${isToday ? 'color:var(--brand)' : ''}">
              ${isToday ? '▶ TODAY — ' : ''}${formatDate(d, 'medium')}
            </div>
            ${evs.length === 0
              ? `<div style="font-size:13px;color:var(--text-muted);padding:4px 0">No events</div>`
              : evs.map(ev => {
                  const m = DB.getMember((ev.member_ids||[])[0]);
                  const color = m?.colour_hex || '#8b949e';
                  return `
                    <div class="schedule-event" data-event-id="${ev.id}">
                      <div class="schedule-event-bar" style="background:${color}"></div>
                      <div class="schedule-event-time">
                        ${ev.is_all_day ? 'All day' : formatTime(new Date(ev.starts_at))}
                        ${!ev.is_all_day ? `<br><span style="color:var(--text-muted);font-size:10px">${formatTime(new Date(ev.ends_at))}</span>` : ''}
                      </div>
                      <div class="schedule-event-info">
                        <div class="schedule-event-title">${escHtml(ev.title)}</div>
                        ${ev.location ? `<div class="schedule-event-sub">📍 ${escHtml(ev.location)}</div>` : ''}
                      </div>
                      <div>${(ev.member_ids||[]).slice(0,3).map(id => DB.getMember(id)?.icon || '').join('')}</div>
                    </div>`;
                }).join('')}
          </div>`;
      }).join('')}
    </div>`;

  body.querySelectorAll('.schedule-event').forEach(el => {
    el.addEventListener('click', () => {
      const ev = DB.getEvents().find(e => e.id === el.dataset.eventId);
      if (ev) openEventDetailModal(ev);
    });
  });
}

/* ── Event block renderer ─────────────────── */
function renderCalEvent(ev, fullWidth = false) {
  const start   = new Date(ev.starts_at);
  const end     = new Date(ev.ends_at);
  const startH  = start.getHours() + start.getMinutes() / 60;
  const endH    = end.getHours() + end.getMinutes() / 60;
  const topH    = Math.max(startH - 7, 0);
  const heightH = Math.max(endH - startH, 0.25);

  const m     = DB.getMember((ev.member_ids||[])[0]);
  const color = m?.colour_hex || '#8b949e';

  return `
    <div class="cal-event"
         data-event-id="${ev.id}"
         data-member="${m?.id?.replace('member-','') || ''}"
         style="top:${topH * 60}px;height:${Math.max(heightH * 60 - 2, 18)}px;
                --member-color:${color};">
      <div class="ev-title">${escHtml(ev.title)}</div>
      ${heightH > 0.5 ? `<div class="ev-time">${formatTime(start)}</div>` : ''}
    </div>`;
}

/* ── Add Event Modal ──────────────────────── */
function openAddEventModal(prefillDate) {
  const members = DB.getMembers().filter(m => m.is_active);
  const dateVal = prefillDate || toDateStr(calDate);
  const todayDt = new Date();
  const hh = String(todayDt.getHours()).padStart(2,'0');
  const mm = String(todayDt.getMinutes()).padStart(2,'0');

  openModal('Add Event', `
    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="form-control" id="ev-title" type="text" placeholder="Event name" maxlength="200">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-control" id="ev-date" type="date" value="${dateVal}">
      </div>
      <div class="form-group">
        <label class="form-label">All day?</label>
        <select class="form-control" id="ev-allday">
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
    </div>
    <div class="form-row" id="ev-time-row">
      <div class="form-group">
        <label class="form-label">Start time</label>
        <input class="form-control" id="ev-start" type="time" value="${hh}:${mm}">
      </div>
      <div class="form-group">
        <label class="form-label">End time</label>
        <input class="form-control" id="ev-end" type="time" value="${hh}:${mm}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Location</label>
      <input class="form-control" id="ev-location" type="text" placeholder="Optional location">
    </div>
    <div class="form-group">
      <label class="form-label">People</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0">
        ${members.map(m => `
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:14px">
            <input type="checkbox" id="ev-m-${m.id}" value="${m.id}" style="width:18px;height:18px">
            ${m.icon} ${m.display_name}
          </label>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-control" id="ev-notes" rows="2" placeholder="Optional notes"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">
        <input type="checkbox" id="ev-countdown" style="width:18px;height:18px">
        Show countdown on home screen
      </label>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" id="ev-cancel">Cancel</button>
      <button class="btn btn-primary" id="ev-save">Save Event</button>
    </div>
  `);

  document.getElementById('ev-cancel').addEventListener('click', closeModal);
  document.getElementById('ev-allday').addEventListener('change', (e) => {
    document.getElementById('ev-time-row').style.display =
      e.target.value === 'yes' ? 'none' : 'flex';
  });

  document.getElementById('ev-save').addEventListener('click', () => {
    const title = document.getElementById('ev-title').value.trim();
    if (!title) { alert('Please enter a title.'); return; }
    const dateStr  = document.getElementById('ev-date').value;
    const allDay   = document.getElementById('ev-allday').value === 'yes';
    const startT   = document.getElementById('ev-start').value;
    const endT     = document.getElementById('ev-end').value;
    const location = document.getElementById('ev-location').value.trim();
    const notes    = document.getElementById('ev-notes').value.trim();
    const countdown= document.getElementById('ev-countdown').checked;
    const memberIds = members
      .filter(m => document.getElementById(`ev-m-${m.id}`)?.checked)
      .map(m => m.id);

    const starts = allDay
      ? `${dateStr}T00:00:00.000Z`
      : `${dateStr}T${startT}:00.000Z`;
    const ends = allDay
      ? `${dateStr}T23:59:00.000Z`
      : `${dateStr}T${endT}:00.000Z`;

    const ev = {
      id: uid(),
      family_id: 'naughton-family-001',
      created_by: AppState.currentMember?.id || 'member-dale',
      ext_cal_id: null,
      title,
      starts_at: starts,
      ends_at: ends,
      is_all_day: allDay,
      location: location || null,
      notes: notes || null,
      recurrence_rule: null,
      source: 'manual',
      countdown_enabled: countdown,
      member_ids: memberIds.length ? memberIds : [AppState.currentMember?.id].filter(Boolean),
    };

    DB.addEvent(ev);
    closeModal();
    // Re-render current body
    const body = document.getElementById('cal-body');
    const label = document.getElementById('cal-label');
    if (body) renderCalBody({ querySelector: (s) => document.querySelector(s) });
    renderCalendar(document.getElementById('screen-calendar'));
  });
}

/* ── Event Detail Modal ───────────────────── */
function openEventDetailModal(ev) {
  const members = (ev.member_ids || []).map(id => DB.getMember(id)).filter(Boolean);
  openModal(ev.title, `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${ev.is_all_day
        ? `<div>📅 <strong>All day</strong> — ${formatDate(ev.starts_at.slice(0,10), 'long')}</div>`
        : `<div>📅 ${formatDate(ev.starts_at.slice(0,10), 'long')}<br>
               🕐 ${formatTime(new Date(ev.starts_at))} – ${formatTime(new Date(ev.ends_at))}</div>`}
      ${ev.location ? `<div>📍 ${escHtml(ev.location)}</div>` : ''}
      ${ev.notes ? `<div>📝 ${escHtml(ev.notes)}</div>` : ''}
      ${members.length ? `<div>👥 ${members.map(m => `${m.icon} ${m.display_name}`).join(', ')}</div>` : ''}
      ${ev.countdown_enabled ? `<div>⏳ Countdown enabled</div>` : ''}
    </div>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-danger btn-sm" id="ev-delete">Delete</button>
      <button class="btn btn-secondary btn-sm" id="ev-close">Close</button>
    </div>
  `);
  document.getElementById('ev-close').addEventListener('click', closeModal);
  document.getElementById('ev-delete').addEventListener('click', () => {
    if (confirm('Delete this event?')) {
      DB.deleteEvent(ev.id);
      closeModal();
      renderCalendar(document.getElementById('screen-calendar'));
    }
  });
}

/* ── Helpers ──────────────────────────────── */
function getFilteredEvents(startStr, endStr) {
  return DB.getEventsForWeek(startStr, endStr)
    .filter(ev => (ev.member_ids || []).some(id => calActiveFilters.has(id)));
}

function formatHour(h) {
  return h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h-12}pm`;
}
