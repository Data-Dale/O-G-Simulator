/* ─────────────────────────────────────────────
   app.js — main init, router, member bar, clock
   ───────────────────────────────────────────── */

import DB from './db.js';
import { seedNaughtonFamily } from './seed.js';
import { uid, todayStr, toDateStr, formatClock, formatDate, el, els, floatXP } from './utils.js';
import { renderHome } from './home.js';
import { renderCalendar } from './calendar.js';
import { renderTasks } from './tasks.js';
import { renderMeals } from './meals.js';
import { renderLists } from './lists.js';
import { renderAdmin } from './admin.js';
import { startScreensaver, stopScreensaver, resetIdle } from './screensaver.js';

/* ── App state ────────────────────────────── */
export const AppState = {
  currentScreen: 'home',
  currentMember: null,
};

/* ── Screen registry ─────────────────────── */
const SCREENS = {
  home:     renderHome,
  calendar: renderCalendar,
  tasks:    renderTasks,
  meals:    renderMeals,
  lists:    renderLists,
  admin:    renderAdmin,
};

/* ── Bootstrap ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Seed data if first run
  seedNaughtonFamily();

  // Generate today's task instances
  generateTodayTasks();

  // Set initial member
  const savedMemberId = DB.getActiveMemberId();
  const members = DB.getMembers();
  AppState.currentMember = DB.getMember(savedMemberId) || members[0];

  // Render member bar
  renderMemberBar();

  // Start clock
  startClock();

  // Render weather placeholder
  renderWeather();

  // Navigate to home
  navigate('home');

  // Wire up sidebar nav
  wireNav();

  // Wire admin button
  wireAdmin();

  // PIN listeners
  initPinListeners();

  // Modal close
  el('#modal-close').addEventListener('click', closeModal);
  el('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === el('#modal-overlay')) closeModal();
  });

  // Celebration close
  el('#celebration-close').addEventListener('click', closeCelebration);

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/treehouse/sw.js').catch(() => {});
  }

  // Idle detector for screensaver
  const idleTimeout = (DB.getSetting('idle_timeout_secs', 120)) * 1000;
  initIdleDetector(idleTimeout);

  // Midnight task refresh
  scheduleMidnightRefresh();
});

/* ── Navigation ──────────────────────────── */
export function navigate(screenId) {
  // Deactivate all screens
  els('.screen').forEach(s => s.classList.remove('active'));
  els('.nav-item[data-screen]').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });

  // Activate target
  const screenEl = el(`#screen-${screenId}`);
  if (!screenEl) return;
  screenEl.classList.add('active');

  const navBtn = el(`.nav-item[data-screen="${screenId}"]`);
  if (navBtn) { navBtn.classList.add('active'); navBtn.setAttribute('aria-selected', 'true'); }

  AppState.currentScreen = screenId;

  // Render the screen
  const renderFn = SCREENS[screenId];
  if (renderFn) renderFn(screenEl);
}

function wireNav() {
  els('.nav-item[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.screen));
  });
}

/* ── Admin PIN ───────────────────────────── */
function wireAdmin() {
  el('#admin-btn').addEventListener('click', () => openPinGate(() => navigate('admin')));
}

/* ── Member bar ──────────────────────────── */
export function renderMemberBar() {
  const container = el('#member-selector');
  const members = DB.getMembers().filter(m => m.is_active);

  container.innerHTML = members.map(m => {
    const shortId = m.id.replace('member-', '');
    const isActive = m.id === AppState.currentMember?.id;
    const xp = DB.getMemberXP(m.id);
    const isKid = m.role === 'child';
    return `
      <button class="member-avatar${isActive ? ' active' : ''}"
              data-member="${shortId}"
              data-id="${m.id}"
              style="--member-color:${m.colour_hex}"
              aria-label="Switch to ${m.display_name}">
        <span class="avatar-icon">${m.icon}</span>
        <span class="avatar-name">${m.display_name}</span>
        ${isKid ? `<span class="avatar-xp">${xp}⭐</span>` : ''}
      </button>`;
  }).join('');

  container.querySelectorAll('.member-avatar').forEach(btn => {
    btn.addEventListener('click', () => {
      const memberId = btn.dataset.id;
      AppState.currentMember = DB.getMember(memberId);
      DB.setActiveMemberId(memberId);
      renderMemberBar();
      // Re-render current screen
      navigate(AppState.currentScreen);
    });
  });
}

/* ── Clock ───────────────────────────────── */
function startClock() {
  const update = () => {
    const now = new Date();
    el('#clock-display').innerHTML = `
      <div class="clock-time">${formatClock()}</div>
      <div class="clock-date">${formatDate(now, 'medium')}</div>`;
  };
  update();
  setInterval(update, 30000);
}

/* ── Weather widget (placeholder) ────────── */
function renderWeather() {
  const w = el('#weather-widget');
  // In a real deployment, integrate an API like Open-Meteo (free, no key)
  w.innerHTML = `<span class="weather-icon">☀️</span><span class="weather-temp">24°</span><span>Brisbane</span>`;

  // Attempt real weather via Open-Meteo (no API key required)
  fetch('https://api.open-meteo.com/v1/forecast?latitude=-27.47&longitude=153.02&current=temperature_2m,weather_code&timezone=Australia%2FBrisbane')
    .then(r => r.json())
    .then(data => {
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      const icon = weatherIcon(code);
      w.innerHTML = `<span class="weather-icon">${icon}</span><span class="weather-temp">${temp}°</span><span>Brisbane</span>`;
    })
    .catch(() => {});
}

function weatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 48) return '☁️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

/* ── Modal ───────────────────────────────── */
export function openModal(title, bodyHtml, { wide = false } = {}) {
  el('#modal-title').textContent = title;
  el('#modal-body').innerHTML = bodyHtml;
  el('#modal-box').style.maxWidth = wide ? '720px' : '520px';
  el('#modal-overlay').classList.remove('hidden');
}

export function closeModal() {
  el('#modal-overlay').classList.add('hidden');
  el('#modal-body').innerHTML = '';
}

/* ── Celebration ─────────────────────────── */
export function showCelebration(emoji, title, xpAmount) {
  el('#celebration-emoji').textContent = emoji;
  el('#celebration-title').textContent = title;
  el('#celebration-xp').textContent = xpAmount ? `+${xpAmount} XP ⭐` : '';
  el('#celebration').classList.remove('hidden');
  el('#celebration').setAttribute('aria-hidden', 'false');
  startConfetti();
  // Auto-close after 6 seconds for Bodhi
  setTimeout(closeCelebration, 6000);
}

function closeCelebration() {
  el('#celebration').classList.add('hidden');
  el('#celebration').setAttribute('aria-hidden', 'true');
  stopConfetti();
}

/* ── Confetti canvas ─────────────────────── */
let confettiAnim = null;
const COLORS = ['#3b82f6','#f43f5e','#22c55e','#f97316','#eab308','#c084fc','#34d399'];

function startConfetti() {
  const canvas = el('#confetti-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 8 + 4,
    d: Math.random() * 4 + 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tilt: Math.random() * 10 - 5,
    tiltAngle: 0,
    tiltAngleInc: Math.random() * 0.07 + 0.05,
  }));

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 3, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 5);
      ctx.stroke();
    });
    updateConfetti(particles, canvas);
    confettiAnim = requestAnimationFrame(draw);
  };
  draw();
}

function updateConfetti(particles, canvas) {
  particles.forEach(p => {
    p.tiltAngle += p.tiltAngleInc;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) * 0.7;
    p.tilt = Math.sin(p.tiltAngle - p.d / 3) * 15;
    if (p.y > canvas.height) {
      p.y = -10;
      p.x = Math.random() * canvas.width;
    }
  });
}

function stopConfetti() {
  if (confettiAnim) { cancelAnimationFrame(confettiAnim); confettiAnim = null; }
  const ctx = el('#confetti-canvas').getContext('2d');
  ctx.clearRect(0, 0, el('#confetti-canvas').width, el('#confetti-canvas').height);
}

/* ── PIN gate ────────────────────────────── */
let pinCallback = null;
let pinBuffer = '';

export function openPinGate(onSuccess) {
  pinCallback = onSuccess;
  pinBuffer = '';
  updatePinDots();
  el('#pin-overlay').classList.remove('hidden');
  el('#pin-error').textContent = '';
}

function initPinListeners() {
  el('#pin-clear').addEventListener('click', () => {
    pinBuffer = pinBuffer.slice(0, -1);
    updatePinDots();
  });

  el('#pin-cancel').addEventListener('click', () => {
    el('#pin-overlay').classList.add('hidden');
    pinBuffer = '';
  });

  document.addEventListener('click', (e) => {
    const key = e.target.closest('.pin-key[data-digit]');
    if (!key) return;
    if (pinBuffer.length >= 4) return;
    pinBuffer += key.dataset.digit;
    updatePinDots();
    if (pinBuffer.length === 4) checkPin();
  });
}

function updatePinDots() {
  els('.pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinBuffer.length);
  });
}

function checkPin() {
  const stored = DB.getSetting('admin_pin', '1234');
  if (pinBuffer === stored) {
    el('#pin-overlay').classList.add('hidden');
    pinBuffer = '';
    if (pinCallback) { pinCallback(); pinCallback = null; }
  } else {
    el('#pin-error').textContent = 'Incorrect PIN. Try again.';
    setTimeout(() => {
      el('#pin-error').textContent = '';
      pinBuffer = '';
      updatePinDots();
    }, 1200);
  }
}

/* ── Idle detector ────────────────────────── */
function initIdleDetector(timeoutMs) {
  let timer;
  const reset = () => {
    clearTimeout(timer);
    stopScreensaver();
    timer = setTimeout(() => {
      if (DB.getSetting('screensaver_enabled', true)) startScreensaver();
    }, timeoutMs);
  };
  ['touchstart','touchmove','click','keydown','pointerdown'].forEach(ev => {
    document.addEventListener(ev, reset, { passive: true });
  });
  reset();
}

/* ── Midnight task refresh ───────────────── */
function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 5, 0);
  const msUntilMidnight = midnight - now;
  setTimeout(() => {
    generateTodayTasks();
    navigate(AppState.currentScreen);
    scheduleMidnightRefresh();
  }, msUntilMidnight);
}

/* ── Task instance generator ─────────────── */
export function generateTodayTasks() {
  const today = todayStr();
  const existing = DB.getTaskInstances(today);
  if (existing.length > 0) return;

  const BYDAY = { MO:1, TU:2, WE:3, TH:4, FR:5, SA:6, SU:0 };
  const now = new Date();
  const dow = now.getDay();

  const isDue = (rule) => {
    if (!rule) return false;
    if (rule.includes('FREQ=DAILY')) return true;
    if (rule.includes('FREQ=WEEKLY')) {
      const m = rule.match(/BYDAY=([A-Z,]+)/);
      if (!m) return dow === 1;
      return m[1].split(',').map(d => BYDAY[d]).includes(dow);
    }
    if (rule.includes('FREQ=MONTHLY')) {
      const m = rule.match(/BYMONTHDAY=(\d+)/);
      return m ? now.getDate() === parseInt(m[1]) : now.getDate() === 1;
    }
    return false;
  };

  const templates = DB.getTaskTemplates();
  const instances = templates
    .filter(t => t.is_active && isDue(t.recurrence_rule))
    .map(t => ({
      id: uid(),
      template_id: t.id,
      assigned_to: t.assigned_to,
      title: t.title,
      icon: t.icon,
      due_date: today,
      due_time: t.due_time || null,
      xp_value: t.xp_value,
      requires_approval: t.requires_approval,
      task_type: t.task_type,
      status: 'pending',
      completed_at: null,
      xp_awarded: null,
      steps: t.steps || [],
    }));

  DB.setTaskInstances(today, instances);
}

/* ── Complete task helper (exported) ─────── */
export function completeTask(instanceId, memberEl) {
  const today = todayStr();
  const instances = DB.getTaskInstances(today);
  const inst = instances.find(i => i.id === instanceId);
  if (!inst || inst.status !== 'pending') return;

  const now = new Date().toISOString();
  DB.updateTaskInstance(today, instanceId, {
    status: inst.requires_approval ? 'done' : 'done',
    completed_at: now,
    xp_awarded: inst.xp_value,
  });

  // Award XP for child tasks
  const member = DB.getMember(inst.assigned_to);
  if (member && member.role === 'child' && inst.xp_value > 0) {
    DB.addXPEntry({
      id: uid(),
      member_id: inst.assigned_to,
      instance_id: instanceId,
      xp_delta: inst.xp_value,
      reason: 'task',
      note: inst.title,
      awarded_by: null,
      created_at: now,
    });

    // Float XP
    if (memberEl) {
      const rect = memberEl.getBoundingClientRect();
      floatXP(inst.xp_value, rect.left + rect.width / 2, rect.top);
    }

    // Check milestones
    checkMilestones(inst.assigned_to, member, inst.xp_value);
  }

  // Re-render member bar (XP updated)
  renderMemberBar();
}

function checkMilestones(memberId, member, xpJustAwarded) {
  const totalXP = DB.getMemberXP(memberId);
  const milestones = DB.getMilestones(memberId).filter(m => !m.achieved_at);

  for (const ms of milestones) {
    if (totalXP >= ms.xp_target) {
      DB.updateMilestone(ms.id, { achieved_at: new Date().toISOString() });
      showCelebration('🏆', ms.label, null);
      return;
    }
  }

  // Regular completion celebration
  if (member.icon_mode) {
    showCelebration('⭐', 'Amazing work, ' + member.display_name + '!', xpJustAwarded);
  } else if (xpJustAwarded >= 20) {
    showCelebration('🎉', 'Great job!', xpJustAwarded);
  }
}
