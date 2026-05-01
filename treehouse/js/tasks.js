/* ─────────────────────────────────────────────
   tasks.js — Tasks & Chores screen
   ───────────────────────────────────────────── */

import DB from './db.js';
import { AppState, completeTask, renderMemberBar, openPinGate, showCelebration } from './app.js';
import { uid, todayStr, formatTimeShort, escHtml, delegate } from './utils.js';

let tasksViewMember = null; // member being viewed

export function renderTasks(container) {
  const members = DB.getMembers().filter(m => m.is_active);
  if (!tasksViewMember) tasksViewMember = AppState.currentMember || members[0];

  container.innerHTML = buildTasksShell(members);
  renderTasksContent(container);
  wireTasksSidebar(container);
}

/* ── Shell ────────────────────────────────── */
function buildTasksShell(members) {
  const today   = todayStr();
  const allInst = DB.getTaskInstances(today);

  return `
    <div class="tasks-sidebar">
      <div class="tasks-sidebar-header">Family Members</div>
      ${members.map(m => {
        const count   = allInst.filter(i => i.assigned_to === m.id).length;
        const done    = allInst.filter(i => i.assigned_to === m.id && i.status === 'done').length;
        const isActive = m.id === tasksViewMember?.id;
        return `
          <button class="tasks-member-btn${isActive ? ' active' : ''}"
                  data-member-id="${m.id}"
                  style="--member-color:${m.colour_hex}">
            <span class="tasks-member-icon">${m.icon}</span>
            <span class="tasks-member-name" style="color:${isActive ? m.colour_hex : ''}">${m.display_name}</span>
            <span class="tasks-member-count${done === count && count > 0 ? ' complete' : ''}">${done}/${count}</span>
          </button>`;
      }).join('')}
    </div>
    <div class="tasks-content" id="tasks-content"></div>`;
}

/* ── Sidebar wiring ───────────────────────── */
function wireTasksSidebar(container) {
  container.querySelectorAll('.tasks-member-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const memberId = btn.dataset.memberId;
      tasksViewMember = DB.getMember(memberId);
      // Update active state
      container.querySelectorAll('.tasks-member-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
      renderTasksContent(container);
    });
  });
}

/* ── Content area ─────────────────────────── */
function renderTasksContent(container) {
  const content = container.querySelector('#tasks-content');
  if (!content || !tasksViewMember) return;

  const member  = tasksViewMember;
  const today   = todayStr();
  const allInst = DB.getTaskInstances(today).filter(i => i.assigned_to === member.id);

  const xp         = DB.getMemberXP(member.id);
  const xpToday    = DB.getMemberXPToday(member.id);
  const milestones = DB.getMilestones(member.id).filter(m => !m.achieved_at).sort((a, b) => a.xp_target - b.xp_target);
  const nextMs     = milestones[0];
  const prevMs     = DB.getMilestones(member.id).filter(m => m.achieved_at).sort((a,b) => b.xp_target - a.xp_target)[0];
  const baseXP     = prevMs?.xp_target || 0;
  const xpRange    = nextMs ? nextMs.xp_target - baseXP : 100;
  const xpPct      = nextMs ? Math.min(Math.round((xp - baseXP) / xpRange * 100), 100) : 100;

  // Group by task_type / time of day
  const morning  = allInst.filter(i => i.task_type === 'routine' && i.due_time && i.due_time < '12:00');
  const chores   = allInst.filter(i => i.task_type === 'chore' || i.task_type === 'maintenance');
  const habits   = allInst.filter(i => i.task_type === 'habit');
  const evening  = allInst.filter(i => i.task_type === 'routine' && (!i.due_time || i.due_time >= '12:00'));
  const other    = allInst.filter(i => !morning.includes(i) && !chores.includes(i) && !habits.includes(i) && !evening.includes(i));

  // Bodhi uses icon mode for certain task types
  const isIconMode = member.icon_mode;

  content.innerHTML = `
    <!-- XP Banner -->
    ${member.role === 'child' ? `
    <div class="xp-banner" data-member="${member.id.replace('member-','')}" style="--member-color:${member.colour_hex}">
      <div class="xp-banner-icon">${member.icon}</div>
      <div class="xp-banner-info">
        <div class="xp-banner-title">${member.display_name}'s Stars</div>
        <div class="xp-banner-points">${xp} ⭐ total${xpToday > 0 ? ` <span style="font-size:14px;color:var(--success)">(+${xpToday} today)</span>` : ''}</div>
        ${nextMs ? `
          <div class="xp-progress-wrap"><div class="xp-progress-bar" style="width:${xpPct}%;background:${member.colour_hex}"></div></div>
          <div class="xp-milestone-label">Next: ${escHtml(nextMs.label)} (${nextMs.xp_target - xp} XP to go)</div>
        ` : '<div class="xp-milestone-label">All milestones achieved! 🏆</div>'}
      </div>
      ${member.role === 'admin' ? '' : `
        <div style="text-align:right">
          <button class="btn btn-sm btn-secondary" id="award-xp-btn">＋ Award XP</button>
        </div>`}
    </div>` : `
    <div style="padding:8px 0;display:flex;align-items:center;gap:12px">
      <span style="font-size:32px">${member.icon}</span>
      <div>
        <div style="font-size:18px;font-weight:700">${member.display_name}</div>
        <div style="font-size:13px;color:var(--text-dim)">${allInst.filter(i=>i.status==='done').length}/${allInst.length} tasks done today</div>
      </div>
    </div>`}

    <!-- Bodhi icon-mode step wizard -->
    ${isIconMode && allInst.some(i => i.steps?.length > 0 && i.status === 'pending') ? renderBodhiWizard(allInst) : ''}

    <!-- Morning Routine -->
    ${morning.length > 0 ? renderTaskGroup('☀️ Morning Routine', morning, member, isIconMode) : ''}
    <!-- Chores -->
    ${chores.length > 0 ? renderTaskGroup('🧹 Chores', chores, member, false) : ''}
    <!-- Habits -->
    ${habits.length > 0 ? renderTaskGroup('💪 Habits & Goals', habits, member, false) : ''}
    <!-- Evening -->
    ${evening.length > 0 ? renderTaskGroup('🌙 Evening Routine', evening, member, isIconMode) : ''}
    <!-- Other -->
    ${other.length > 0 ? renderTaskGroup('📋 Other', other, member, false) : ''}

    ${allInst.length === 0 ? `
    <div class="empty-state">
      <span class="empty-icon">${member.icon}</span>
      <p>No tasks for ${member.display_name} today!</p>
    </div>` : ''}

    <!-- Admin: approve pending tasks -->
    ${AppState.currentMember?.role === 'admin' && member.role === 'child' ? `
    <div style="margin-top:8px">
      <button class="btn btn-secondary" id="approve-tasks-btn">Approve Pending Tasks</button>
    </div>` : ''}
  `;

  // Wire task completion
  content.querySelectorAll('.task-complete-btn[data-instance-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const instanceId = btn.dataset.instanceId;
      const card = btn.closest('.task-card');
      if (card?.classList.contains('done')) return;
      completeTask(instanceId, btn);
      renderTasksContent(container);
      // Update sidebar counts
      updateSidebarCounts(container);
    });
  });

  // Bodhi step wizard
  content.querySelectorAll('.bodhi-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const instanceId = btn.dataset.instanceId;
      const stepIdx    = parseInt(btn.dataset.stepIdx);
      advanceBodhiStep(instanceId, stepIdx, content, container);
    });
  });

  // Award XP button (admin)
  content.querySelector('#award-xp-btn')?.addEventListener('click', () => openAwardXPModal(member));

  // Approve tasks button
  content.querySelector('#approve-tasks-btn')?.addEventListener('click', () => {
    openPinGate(() => approveAllPending(member, container));
  });
}

/* ── Task Group ───────────────────────────── */
function renderTaskGroup(title, instances, member, iconMode) {
  const done  = instances.filter(i => i.status === 'done').length;
  const total = instances.length;
  const isChild = member.role === 'child';

  return `
    <div>
      <div class="task-group-header">
        ${title}
        <span class="task-group-progress${done === total && total > 0 ? ' complete' : ''}">${done}/${total}</span>
      </div>
      ${instances.map(inst => renderTaskCard(inst, member, isChild)).join('')}
    </div>`;
}

function renderTaskCard(inst, member, showXP) {
  const isDone = inst.status === 'done';
  const color  = member.colour_hex;

  return `
    <div class="task-card${isDone ? ' done' : ''}" style="--member-color:${color}">
      <div class="task-card-icon">${inst.icon}</div>
      <div class="task-card-body">
        <div class="task-card-title">${escHtml(inst.title)}</div>
        <div class="task-card-meta">
          ${inst.due_time ? `⏰ ${formatTimeShort(inst.due_time)} · ` : ''}
          ${isDone ? '✅ Done' : inst.requires_approval ? 'Needs parent approval' : 'Tap to complete'}
        </div>
      </div>
      ${showXP && inst.xp_value > 0 ? `<span class="task-card-xp">+${inst.xp_value} ⭐</span>` : ''}
      <button class="task-complete-btn${isDone ? ' bounce-check' : ''}"
              data-instance-id="${inst.id}"
              aria-label="${isDone ? 'Completed' : 'Mark complete'}"
              ${isDone ? 'disabled' : ''}>
        ${isDone ? '✓' : '○'}
      </button>
    </div>`;
}

/* ── Bodhi Step Wizard ────────────────────── */
let bodhiSteps = {}; // instanceId -> currentStepIdx

function renderBodhiWizard(instances) {
  const activeInst = instances.find(i => i.steps?.length > 0 && i.status === 'pending');
  if (!activeInst) return '';

  const steps = activeInst.steps;
  const currentStep = bodhiSteps[activeInst.id] || 0;
  if (currentStep >= steps.length) return '';

  const step = steps[currentStep];
  return `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:8px">
        🌟 Current Task — ${escHtml(activeInst.title)}
        <span style="color:var(--text-muted)"> (Step ${currentStep+1} of ${steps.length})</span>
      </div>
      <div class="bodhi-step-card active">
        <div class="bodhi-step-icon">${step.icon_url || activeInst.icon}</div>
        <div class="bodhi-step-text">${escHtml(step.instruction)}</div>
        <button class="bodhi-step-btn"
                data-instance-id="${activeInst.id}"
                data-step-idx="${currentStep}">
          ${currentStep + 1 < steps.length ? 'Done! ➡️' : 'All done! ✅'}
        </button>
      </div>
      <div style="margin-top:8px;display:flex;gap:4px">
        ${steps.map((_, i) => `<div style="flex:1;height:4px;border-radius:2px;background:${i <= currentStep ? 'var(--bodhi)' : 'var(--surface3)'}"></div>`).join('')}
      </div>
    </div>`;
}

function advanceBodhiStep(instanceId, stepIdx, content, container) {
  const today    = todayStr();
  const instances = DB.getTaskInstances(today);
  const inst     = instances.find(i => i.id === instanceId);
  if (!inst) return;

  const nextStep = stepIdx + 1;
  if (nextStep >= inst.steps.length) {
    // Task complete
    bodhiSteps[instanceId] = 0;
    completeTask(instanceId, content);
    renderTasksContent(container);
    updateSidebarCounts(container);
  } else {
    bodhiSteps[instanceId] = nextStep;
    renderTasksContent(container);
  }
}

/* ── Award XP Modal ───────────────────────── */
function openAwardXPModal(member) {
  openModal(`Award XP — ${member.display_name}`, `
    <div class="form-group">
      <label class="form-label">XP Amount</label>
      <input class="form-control" id="xp-amount" type="number" min="-100" max="200" value="10">
    </div>
    <div class="form-group">
      <label class="form-label">Reason</label>
      <select class="form-control" id="xp-reason">
        <option value="bonus">Bonus</option>
        <option value="deduct">Deduction</option>
        <option value="milestone">Milestone</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="xp-note" type="text" placeholder="Optional note">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" id="xp-cancel">Cancel</button>
      <button class="btn btn-primary" id="xp-save">Award</button>
    </div>
  `);

  document.getElementById('xp-cancel').addEventListener('click', closeModal);
  document.getElementById('xp-save').addEventListener('click', () => {
    const amt    = parseInt(document.getElementById('xp-amount').value) || 0;
    const reason = document.getElementById('xp-reason').value;
    const note   = document.getElementById('xp-note').value.trim();
    if (amt !== 0) {
      DB.addXPEntry({
        id: uid(),
        member_id: member.id,
        instance_id: null,
        xp_delta: amt,
        reason,
        note: note || null,
        awarded_by: AppState.currentMember?.id || null,
        created_at: new Date().toISOString(),
      });
      renderMemberBar();
    }
    closeModal();
    const container = document.getElementById('screen-tasks');
    if (container) renderTasksContent(container);
  });
}

/* ── Approve tasks ────────────────────────── */
function approveAllPending(member, container) {
  const today = todayStr();
  const instances = DB.getTaskInstances(today)
    .filter(i => i.assigned_to === member.id && i.status === 'done' && i.requires_approval);

  instances.forEach(inst => {
    DB.updateTaskInstance(today, inst.id, { status: 'approved' });
  });

  if (instances.length > 0) {
    showCelebration('👍', `${instances.length} task${instances.length > 1 ? 's' : ''} approved!`, null);
  }
  renderTasksContent(container);
  updateSidebarCounts(container);
}

/* ── Sidebar count update ─────────────────── */
function updateSidebarCounts(container) {
  const today   = todayStr();
  const allInst = DB.getTaskInstances(today);
  const members = DB.getMembers().filter(m => m.is_active);

  members.forEach(m => {
    const btn   = container.querySelector(`.tasks-member-btn[data-member-id="${m.id}"]`);
    if (!btn) return;
    const count = allInst.filter(i => i.assigned_to === m.id).length;
    const done  = allInst.filter(i => i.assigned_to === m.id && i.status === 'done').length;
    const badge = btn.querySelector('.tasks-member-count');
    if (badge) badge.textContent = `${done}/${count}`;
  });
}
