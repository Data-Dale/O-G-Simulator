/* ─────────────────────────────────────────────
   home.js — Dashboard screen
   ───────────────────────────────────────────── */

import DB from './db.js';
import { AppState, navigate } from './app.js';
import { todayStr, toDateStr, weekStart, addDays, formatTime, formatDate,
         formatTimeShort, daysUntil, greetingFor, escHtml } from './utils.js';

export function renderHome(container) {
  const member  = AppState.currentMember;
  const today   = todayStr();
  const now     = new Date();

  const events     = DB.getEventsForDate(today);
  const instances  = DB.getTaskInstances(today);
  const myTasks    = instances.filter(i => i.assigned_to === member?.id);
  const members    = DB.getMembers().filter(m => m.is_active);
  const weekStartD = weekStart(now);
  const weekStartStr = toDateStr(weekStartD);
  const todayDow   = ((now.getDay() + 6) % 7) + 1; // 1=Mon…7=Sun
  const todayMeals = ['breakfast','lunch','dinner']
    .map(type => DB.getMealSlot(weekStartStr, todayDow, type))
    .filter(Boolean);

  const kids    = members.filter(m => m.role === 'child');
  const allXP   = kids.map(m => ({ member: m, xp: DB.getMemberXP(m.id) }));
  const maxXP   = Math.max(...allXP.map(x => x.xp), 1);

  // Countdown events
  const countdowns = DB.getEvents()
    .filter(e => e.countdown_enabled)
    .map(e => ({ ...e, daysLeft: daysUntil(e.starts_at.slice(0, 10)) }))
    .filter(e => e.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 2);

  // Upcoming events (sorted by time)
  const upcomingEvents = events
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 6);

  // Done/pending tasks
  const done    = myTasks.filter(t => t.status === 'done').length;
  const pending = myTasks.filter(t => t.status === 'pending').length;
  const total   = myTasks.length;

  // Dale's bike training countdown
  const nextMilestone = member?.role === 'child'
    ? (DB.getMilestones(member.id).filter(m => !m.achieved_at)
        .sort((a, b) => a.xp_target - b.xp_target)[0])
    : null;

  const myXP      = member?.role === 'child' ? DB.getMemberXP(member.id) : 0;
  const xpToNext  = nextMilestone ? nextMilestone.xp_target - myXP : 0;

  container.innerHTML = `
    <div class="home-grid" style="padding:14px; gap:14px; display:grid;
         grid-template-columns:1fr 1fr 1fr; grid-template-rows:auto 1fr 1fr; overflow:hidden;">

      <!-- Greeting banner -->
      <div class="home-greeting" style="grid-column:1/-1">
        <div class="home-greeting-text">
          <h1>${escHtml(greetingFor(member))}</h1>
          <p>${formatDate(now, 'long')} &nbsp;·&nbsp; ${total > 0 ? `${done} of ${total} tasks done` : 'No tasks today 🎉'}</p>
          ${nextMilestone ? `
            <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
              <span style="font-size:12px;color:var(--text-dim)">Next reward:</span>
              <span style="font-size:12px;font-weight:700;color:var(--member-color,var(--warning))"
                    style="--member-color:${member?.colour_hex}">${escHtml(nextMilestone.label)}</span>
              <span style="font-size:12px;color:var(--text-dim)">${xpToNext > 0 ? `(${xpToNext} XP to go)` : '🎉 Ready to claim!'}</span>
            </div>` : ''}
        </div>
        <div class="home-greeting-icon">${member?.icon || '🌳'}</div>
      </div>

      <!-- Today's Events -->
      <div class="card" style="grid-column:1;grid-row:2;overflow:hidden;display:flex;flex-direction:column;">
        <div class="card-header">
          <span class="card-title">📅 Today's Schedule</span>
          <button class="card-action" id="home-more-events">See all →</button>
        </div>
        <div style="flex:1;overflow-y:auto">
          ${upcomingEvents.length === 0
            ? `<div class="empty-state"><span class="empty-icon">🗓️</span><p>Nothing on today</p></div>`
            : upcomingEvents.map(ev => {
                const evMemberIds = ev.member_ids || [];
                const evMembers = evMemberIds.slice(0,3).map(id => DB.getMember(id)).filter(Boolean);
                const primaryColor = evMembers[0]?.colour_hex || '#8b949e';
                return `
                  <div class="event-pill" style="--member-color:${primaryColor}">
                    <div class="event-pill-bar"></div>
                    <div class="event-pill-time">${ev.is_all_day ? 'All day' : formatTime(new Date(ev.starts_at))}</div>
                    <div class="event-pill-title">${escHtml(ev.title)}</div>
                    <div class="event-pill-member">${evMembers.map(m => m.icon).join('')}</div>
                  </div>`;
              }).join('')}
        </div>
      </div>

      <!-- My Tasks Today -->
      <div class="card" style="grid-column:2;grid-row:2;overflow:hidden;display:flex;flex-direction:column;">
        <div class="card-header">
          <span class="card-title">✅ My Tasks</span>
          <button class="card-action" id="home-more-tasks">Go to tasks →</button>
        </div>
        <div style="flex:1;overflow-y:auto">
          ${myTasks.length === 0
            ? `<div class="empty-state"><span class="empty-icon">✅</span><p>All done!</p></div>`
            : myTasks.slice(0, 7).map(t => `
                <div class="home-task-row">
                  <span class="task-icon">${t.icon}</span>
                  <span class="task-name">${escHtml(t.title)}</span>
                  ${t.due_time ? `<span style="font-size:11px;color:var(--text-muted)">${formatTimeShort(t.due_time)}</span>` : ''}
                  <span class="task-status-dot ${t.status === 'done' ? 'done' : ''}"></span>
                </div>`).join('')}
        </div>
        ${total > 0 ? `
        <div style="padding:8px 14px;border-top:1px solid var(--border)">
          <div style="background:var(--surface3);border-radius:4px;height:6px;overflow:hidden">
            <div style="height:100%;border-radius:4px;background:var(--success);width:${total ? Math.round(done/total*100) : 0}%;transition:width 0.5s ease"></div>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px">${done}/${total} complete</div>
        </div>` : ''}
      </div>

      <!-- Today's Meals -->
      <div class="card" style="grid-column:3;grid-row:2;overflow:hidden;display:flex;flex-direction:column;">
        <div class="card-header">
          <span class="card-title">🍽️ Today's Meals</span>
          <button class="card-action" id="home-more-meals">Meal plan →</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:8px 0">
          ${['breakfast','lunch','dinner'].map(type => {
            const slot = DB.getMealSlot(weekStartStr, todayDow, type);
            const recipe = slot?.recipe_id ? DB.getRecipe(slot.recipe_id) : null;
            const label = type.charAt(0).toUpperCase() + type.slice(1);
            const name  = recipe?.name || slot?.free_text || '—';
            const icon  = recipe?.icon || (type === 'breakfast' ? '🌅' : type === 'lunch' ? '🌤️' : '🌙');
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;
                          border-bottom:1px solid var(--border)">
                <span style="font-size:22px">${icon}</span>
                <div>
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;
                              color:var(--text-muted)">${label}</div>
                  <div style="font-size:14px;font-weight:600">${escHtml(name)}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- XP Leaderboard (kids) + Countdowns -->
      <div style="grid-column:1/3;grid-row:3;display:flex;gap:14px;overflow:hidden;min-height:0">
        ${kids.length > 0 ? `
        <div class="card" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
          <div class="card-header"><span class="card-title">⭐ XP Leaderboard</span></div>
          <div style="flex:1;overflow-y:auto">
            ${allXP
                .sort((a, b) => b.xp - a.xp)
                .map((entry, i) => {
                  const pct = Math.round(entry.xp / maxXP * 100);
                  const medals = ['🥇','🥈','🥉'];
                  const nextMs = DB.getMilestones(entry.member.id)
                    .filter(m => !m.achieved_at)
                    .sort((a,b) => a.xp_target - b.xp_target)[0];
                  return `
                    <div class="xp-row" data-member="${entry.member.id.replace('member-','')}">
                      <span class="xp-rank">${medals[i] || (i+1)}</span>
                      <span class="xp-name" style="color:${entry.member.colour_hex}">${entry.member.icon} ${entry.member.display_name}</span>
                      <div class="xp-bar-wrap">
                        <div class="xp-bar" style="width:${pct}%;background:${entry.member.colour_hex}"></div>
                      </div>
                      <span class="xp-total">${entry.xp} XP${nextMs ? ` / ${nextMs.xp_target}` : ''}</span>
                    </div>`;
                }).join('')}
          </div>
        </div>` : ''}

        ${countdowns.length > 0 ? `
        <div style="flex:0 0 240px;display:flex;flex-direction:column;gap:10px;overflow:hidden">
          ${countdowns.map(ev => {
            const evMids = ev.member_ids || [];
            const primaryMember = DB.getMember(evMids[0]);
            const color = primaryMember?.colour_hex || '#22c55e';
            return `
              <div class="countdown-card" style="flex:1;border-color:${color}22">
                <div>
                  <div class="countdown-event" style="font-size:13px">${escHtml(ev.title)}</div>
                  <div class="countdown-label" style="font-size:11px;color:var(--text-dim);margin-top:2px">Coming up</div>
                </div>
                <div style="text-align:right">
                  <div class="countdown-days" style="color:${color}">${ev.daysLeft}</div>
                  <div class="countdown-label">${ev.daysLeft === 1 ? 'day' : 'days'}</div>
                </div>
              </div>`;
          }).join('')}
        </div>` : ''}
      </div>

      <!-- Family overview (adults) / quick stats (kids) -->
      <div class="card" style="grid-column:3;grid-row:3;overflow:hidden;display:flex;flex-direction:column">
        <div class="card-header"><span class="card-title">🌳 Family Today</span></div>
        <div style="flex:1;overflow-y:auto;padding:8px 0">
          ${members.map(m => {
            const mTasks = instances.filter(i => i.assigned_to === m.id);
            const mDone  = mTasks.filter(t => t.status === 'done').length;
            const mTotal = mTasks.length;
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;
                          border-bottom:1px solid color-mix(in srgb, var(--border) 50%, transparent)">
                <span style="font-size:20px">${m.icon}</span>
                <span style="flex:1;font-size:14px;font-weight:600;color:${m.colour_hex}">${m.display_name}</span>
                ${mTotal > 0 ? `<span style="font-size:12px;color:var(--text-dim)">${mDone}/${mTotal} tasks</span>` : ''}
                ${m.role === 'child' ? `<span style="font-size:11px;font-weight:700;color:${m.colour_hex}">${DB.getMemberXP(m.id)} XP</span>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>

    </div>`;

  // Wire quick nav buttons
  container.querySelector('#home-more-events')?.addEventListener('click', () => navigate('calendar'));
  container.querySelector('#home-more-tasks')?.addEventListener('click', () => navigate('tasks'));
  container.querySelector('#home-more-meals')?.addEventListener('click', () => navigate('meals'));
}
