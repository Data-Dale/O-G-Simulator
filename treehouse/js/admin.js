/* ─────────────────────────────────────────────
   admin.js — Admin panel (PIN-protected)
   ───────────────────────────────────────────── */

import DB from './db.js';
import { AppState, renderMemberBar, openModal, closeModal, generateTodayTasks } from './app.js';
import { uid, todayStr, escHtml } from './utils.js';

export function renderAdmin(container) {
  const members = DB.getMembers();
  const settings = DB.getSettings();
  const tasks = DB.getTaskTemplates();
  const milestones = DB.getMilestones();

  container.innerHTML = `
    <div style="padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:20px;height:100%">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1 style="font-size:22px;font-weight:800">⚙️ Admin Panel</h1>
          <p style="color:var(--text-dim);font-size:13px;margin-top:2px">Manage your Treehouse family hub</p>
        </div>
        <button class="btn btn-secondary" id="admin-reset-tasks">🔄 Regenerate Today's Tasks</button>
      </div>

      <div class="admin-grid">

        <!-- Family Members -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">👨‍👩‍👧‍👦 Family Members</span>
          </div>
          <div style="padding:8px 0">
            ${members.map(m => `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                          border-bottom:1px solid var(--border)">
                <span style="font-size:22px">${m.icon}</span>
                <div style="flex:1">
                  <div style="font-size:14px;font-weight:700;color:${m.colour_hex}">${m.display_name}</div>
                  <div style="font-size:11px;color:var(--text-dim)">${m.role} · ${m.age_group}</div>
                </div>
                <div style="width:16px;height:16px;border-radius:50%;background:${m.colour_hex};flex-shrink:0"></div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Task Templates -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📋 Task Templates</span>
            <button class="card-action" id="add-task-btn">＋ Add</button>
          </div>
          <div style="overflow-y:auto;max-height:280px">
            ${tasks.map(t => {
              const assignee = DB.getMember(t.assigned_to);
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;
                            border-bottom:1px solid var(--border);opacity:${t.is_active ? 1 : 0.5}">
                  <span style="font-size:18px">${t.icon}</span>
                  <div style="flex:1">
                    <div style="font-size:13px;font-weight:600">${escHtml(t.title)}</div>
                    <div style="font-size:11px;color:${assignee?.colour_hex || 'var(--text-dim)'}">
                      ${assignee?.icon || ''} ${assignee?.display_name || '?'} · +${t.xp_value} XP
                    </div>
                  </div>
                  <button class="btn btn-sm btn-secondary" data-toggle-task="${t.id}">${t.is_active ? 'Disable' : 'Enable'}</button>
                  <button class="btn btn-sm" style="color:var(--danger)" data-delete-task="${t.id}">✕</button>
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Reward Milestones -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🏆 Milestones</span>
            <button class="card-action" id="add-milestone-btn">＋ Add</button>
          </div>
          <div style="overflow-y:auto;max-height:280px">
            ${milestones.length === 0 ? '<div class="empty-state" style="padding:20px"><p>No milestones yet</p></div>' : ''}
            ${milestones.map(ms => {
              const member = DB.getMember(ms.member_id);
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;
                            border-bottom:1px solid var(--border)">
                  <span style="font-size:18px">${ms.achieved_at ? '✅' : '🎯'}</span>
                  <div style="flex:1">
                    <div style="font-size:13px;font-weight:600">${escHtml(ms.label)}</div>
                    <div style="font-size:11px;color:${member?.colour_hex || 'var(--text-dim)'}">
                      ${member?.icon || ''} ${member?.display_name || '?'} · ${ms.xp_target} XP
                    </div>
                    ${ms.achieved_at ? `<div style="font-size:10px;color:var(--success)">Achieved ✓</div>` : ''}
                  </div>
                  <button class="btn btn-sm" style="color:var(--danger)" data-delete-ms="${ms.id}">✕</button>
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Settings -->
        <div class="card">
          <div class="card-header"><span class="card-title">🔧 Settings</span></div>
          <div style="padding:14px;display:flex;flex-direction:column;gap:12px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Admin PIN</label>
              <input class="form-control" id="setting-pin" type="password" value="${escHtml(settings.admin_pin || '1234')}" maxlength="8" placeholder="4-digit PIN">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Screensaver idle timeout (seconds)</label>
              <input class="form-control" id="setting-idle" type="number" min="30" max="600" value="${settings.idle_timeout_secs || 120}">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">
                <input type="checkbox" id="setting-ss" ${settings.screensaver_enabled !== false ? 'checked' : ''}>
                Enable screensaver
              </label>
            </div>
            <button class="btn btn-primary btn-sm" id="save-settings">Save Settings</button>
          </div>
        </div>

        <!-- XP Summary -->
        <div class="card">
          <div class="card-header"><span class="card-title">⭐ XP Summary</span></div>
          <div style="padding:8px 0">
            ${members.filter(m => m.role === 'child').map(m => {
              const xp = DB.getMemberXP(m.id);
              const todayXP = DB.getMemberXPToday(m.id);
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
                  <span style="font-size:22px">${m.icon}</span>
                  <div style="flex:1">
                    <div style="font-weight:700;color:${m.colour_hex}">${m.display_name}</div>
                    <div style="font-size:12px;color:var(--text-dim)">Today: +${todayXP} XP</div>
                  </div>
                  <div style="font-size:20px;font-weight:800;color:${m.colour_hex}">${xp} ⭐</div>
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Data Actions -->
        <div class="card">
          <div class="card-header"><span class="card-title">💾 Data</span></div>
          <div style="padding:14px;display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-secondary" id="export-data">📤 Export Data (JSON)</button>
            <button class="btn btn-danger btn-sm" id="reset-data">⚠️ Reset All Data</button>
            <p style="font-size:11px;color:var(--text-muted)">All data is stored locally on this device. No cloud sync.</p>
          </div>
        </div>

      </div>
    </div>
  `;

  // Wire events
  wireAdmin(container);
}

function wireAdmin(container) {
  // Regenerate today's tasks
  container.querySelector('#admin-reset-tasks')?.addEventListener('click', () => {
    const today = todayStr();
    DB.setTaskInstances(today, []);
    generateTodayTasks();
    alert('Today\'s tasks regenerated!');
  });

  // Add task template
  container.querySelector('#add-task-btn')?.addEventListener('click', () => openAddTaskModal(container));

  // Toggle task
  container.querySelectorAll('[data-toggle-task]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleTask;
      const t  = DB.getTaskTemplates().find(x => x.id === id);
      if (t) DB.updateTaskTemplate(id, { is_active: !t.is_active });
      renderAdmin(container);
    });
  });

  // Delete task
  container.querySelectorAll('[data-delete-task]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this task template?')) {
        DB.deleteTaskTemplate(btn.dataset.deleteTask);
        renderAdmin(container);
      }
    });
  });

  // Add milestone
  container.querySelector('#add-milestone-btn')?.addEventListener('click', () => openAddMilestoneModal(container));

  // Delete milestone
  container.querySelectorAll('[data-delete-ms]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this milestone?')) {
        const milestones = (DB._get('milestones') || []).filter(m => m.id !== btn.dataset.deleteMs);
        DB._set('milestones', milestones);
        renderAdmin(container);
      }
    });
  });

  // Save settings
  container.querySelector('#save-settings')?.addEventListener('click', () => {
    const pin  = container.querySelector('#setting-pin').value.trim();
    const idle = parseInt(container.querySelector('#setting-idle').value) || 120;
    const ss   = container.querySelector('#setting-ss').checked;
    DB.setSettings({ ...DB.getSettings(), admin_pin: pin, idle_timeout_secs: idle, screensaver_enabled: ss });
    alert('Settings saved!');
  });

  // Export
  container.querySelector('#export-data')?.addEventListener('click', () => {
    const data = {
      members: DB.getMembers(),
      events:  DB.getEvents(),
      task_templates: DB.getTaskTemplates(),
      milestones: DB.getMilestones(),
      xp_ledger: DB.getXPLedger(),
      recipes: DB.getRecipes(),
      lists: DB.getLists(),
      settings: DB.getSettings(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `treehouse-backup-${todayStr()}.json`;
    a.click();
  });

  // Reset
  container.querySelector('#reset-data')?.addEventListener('click', () => {
    if (confirm('⚠️ This will delete ALL family data and reset to seed data. Are you sure?')) {
      if (confirm('Really? This cannot be undone!')) {
        Object.keys(localStorage).filter(k => k.startsWith('th:')).forEach(k => localStorage.removeItem(k));
        location.reload();
      }
    }
  });
}

/* ── Add Task Template Modal ──────────────── */
function openAddTaskModal(container) {
  const members = DB.getMembers().filter(m => m.is_active);

  openModal('Add Task Template', `
    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="form-control" id="at-title" type="text" placeholder="Task name" maxlength="200">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Icon (emoji)</label>
        <input class="form-control" id="at-icon" type="text" placeholder="✅" maxlength="4" style="font-size:24px;text-align:center">
      </div>
      <div class="form-group">
        <label class="form-label">Task Type</label>
        <select class="form-control" id="at-type">
          <option value="chore">Chore</option>
          <option value="routine">Routine</option>
          <option value="habit">Habit</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Assign To</label>
      <select class="form-control" id="at-member">
        ${members.map(m => `<option value="${m.id}">${m.icon} ${m.display_name}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">XP Value</label>
        <input class="form-control" id="at-xp" type="number" min="0" max="100" value="10">
      </div>
      <div class="form-group">
        <label class="form-label">Due Time</label>
        <input class="form-control" id="at-time" type="time">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Recurrence</label>
      <select class="form-control" id="at-recurrence">
        <option value="FREQ=DAILY">Daily</option>
        <option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Weekdays (Mon–Fri)</option>
        <option value="FREQ=WEEKLY;BYDAY=MO,WE,FR">Mon / Wed / Fri</option>
        <option value="FREQ=WEEKLY;BYDAY=TU,TH">Tue / Thu</option>
        <option value="FREQ=WEEKLY;BYDAY=SA">Saturdays</option>
        <option value="FREQ=WEEKLY;BYDAY=MO">Weekly (Monday)</option>
        <option value="FREQ=MONTHLY;BYMONTHDAY=1">Monthly (1st)</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">
        <input type="checkbox" id="at-approval"> Requires parent approval
      </label>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" id="at-cancel">Cancel</button>
      <button class="btn btn-primary" id="at-save">Save</button>
    </div>
  `);

  document.getElementById('at-cancel').addEventListener('click', closeModal);
  document.getElementById('at-save').addEventListener('click', () => {
    const title = document.getElementById('at-title').value.trim();
    if (!title) { alert('Please enter a title.'); return; }
    DB.addTaskTemplate({
      id: uid(),
      family_id: 'naughton-family-001',
      assigned_to: document.getElementById('at-member').value,
      title,
      icon: document.getElementById('at-icon').value.trim() || '✅',
      task_type: document.getElementById('at-type').value,
      recurrence_rule: document.getElementById('at-recurrence').value,
      due_time: document.getElementById('at-time').value || null,
      xp_value: parseInt(document.getElementById('at-xp').value) || 0,
      requires_approval: document.getElementById('at-approval').checked,
      is_active: true,
      steps: [],
    });
    closeModal();
    renderAdmin(container);
  });
}

/* ── Add Milestone Modal ──────────────────── */
function openAddMilestoneModal(container) {
  const kids = DB.getMembers().filter(m => m.role === 'child');
  openModal('Add Milestone', `
    <div class="form-group">
      <label class="form-label">Member</label>
      <select class="form-control" id="ms-member">
        ${kids.map(m => `<option value="${m.id}">${m.icon} ${m.display_name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Reward Label</label>
      <input class="form-control" id="ms-label" type="text" placeholder="e.g. Movie Night 🎬" maxlength="200">
    </div>
    <div class="form-group">
      <label class="form-label">XP Target</label>
      <input class="form-control" id="ms-xp" type="number" min="1" max="10000" value="200">
    </div>
    <div class="form-group">
      <label class="form-label">Reward Description</label>
      <input class="form-control" id="ms-reward" type="text" placeholder="What they get" maxlength="300">
    </div>
    <div class="form-group">
      <label class="form-label">Celebration Type</label>
      <select class="form-control" id="ms-celebration">
        <option value="confetti">Confetti</option>
        <option value="fireworks">Fireworks</option>
        <option value="stars">Stars</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" id="ms-cancel">Cancel</button>
      <button class="btn btn-primary" id="ms-save">Save</button>
    </div>
  `);

  document.getElementById('ms-cancel').addEventListener('click', closeModal);
  document.getElementById('ms-save').addEventListener('click', () => {
    const label = document.getElementById('ms-label').value.trim();
    if (!label) { alert('Please enter a label.'); return; }
    const milestones = DB._get('milestones') || [];
    milestones.push({
      id: uid(),
      member_id: document.getElementById('ms-member').value,
      label,
      xp_target: parseInt(document.getElementById('ms-xp').value) || 200,
      reward_description: document.getElementById('ms-reward').value.trim() || null,
      achieved_at: null,
      celebration_type: document.getElementById('ms-celebration').value,
    });
    DB._set('milestones', milestones);
    closeModal();
    renderAdmin(container);
  });
}
