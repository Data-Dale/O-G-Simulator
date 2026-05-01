/* ─────────────────────────────────────────────
   utils.js — shared helpers
   ───────────────────────────────────────────── */

export const uid = () => crypto.randomUUID();

/* ── Date helpers ─────────────────────────── */

export const toDateStr = (date = new Date()) =>
  date.toISOString().slice(0, 10);

export const todayStr = () => toDateStr();

export const parseDate = (str) => {
  const d = new Date(str);
  return isNaN(d) ? new Date() : d;
};

/** Return the Monday of the week containing `date` */
export const weekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Mon = 0 offset
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Add `n` days to a date */
export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/** Array of 7 date strings for the week containing `date` */
export const weekDates = (date = new Date()) => {
  const mon = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => toDateStr(addDays(mon, i)));
};

/* ── Formatting ───────────────────────────── */

const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const formatDate = (date, fmt = 'long') => {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  if (fmt === 'long')   return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  if (fmt === 'medium') return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  if (fmt === 'short')  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  if (fmt === 'day')    return DAY_SHORT[d.getDay()];
  if (fmt === 'daynum') return `${DAY_SHORT[d.getDay()]} ${d.getDate()}`;
  if (fmt === 'month')  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  return d.toLocaleDateString('en-AU');
};

export const formatTime = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')}${ampm}`;
};

export const formatTimeShort = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m === 0 ? `${hh}${ampm}` : `${hh}:${String(m).padStart(2,'0')}${ampm}`;
};

export const formatClock = () => {
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const daysUntil = (dateStr) => {
  const target = new Date(dateStr + 'T00:00:00');
  const now    = new Date(); now.setHours(0,0,0,0);
  return Math.round((target - now) / 86400000);
};

export const greetingFor = (member) => {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${member.display_name}!`;
};

/* ── Recurrence helpers ───────────────────── */

const BYDAY_MAP = { MO:1, TU:2, WE:3, TH:4, FR:5, SA:6, SU:0 };

export const isTaskDueToday = (template) => {
  if (!template.is_active) return false;
  const rule = template.recurrence_rule || '';
  if (!rule) return false;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun

  if (rule.includes('FREQ=DAILY')) return true;

  if (rule.includes('FREQ=WEEKLY')) {
    const match = rule.match(/BYDAY=([A-Z,]+)/);
    if (!match) return dayOfWeek === 1; // default Monday
    const days = match[1].split(',').map(d => BYDAY_MAP[d]);
    return days.includes(dayOfWeek);
  }

  if (rule.includes('FREQ=MONTHLY')) {
    const match = rule.match(/BYMONTHDAY=(\d+)/);
    if (match) return today.getDate() === parseInt(match[1]);
    return today.getDate() === 1;
  }

  if (rule.includes('FREQ=WEEKLY;INTERVAL=2')) {
    // Fortnightly — check if this is an even week
    const weekNum = Math.floor((today - new Date(today.getFullYear(), 0, 1)) / 604800000);
    return weekNum % 2 === 0;
  }

  return false;
};

/* ── DOM helpers ──────────────────────────── */

export const el = (selector) => document.querySelector(selector);
export const els = (selector) => [...document.querySelectorAll(selector)];

export const html = (strings, ...vals) =>
  strings.reduce((acc, str, i) => acc + str + (vals[i] !== undefined ? String(vals[i]) : ''), '');

export const escHtml = (str) =>
  String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/** Replace element's HTML and set data-member attr */
export const renderInto = (selector, htmlStr, member) => {
  const node = typeof selector === 'string' ? el(selector) : selector;
  if (!node) return;
  node.innerHTML = htmlStr;
  if (member) node.dataset.member = member.id.replace('member-', '');
};

/* ── Event helpers ────────────────────────── */

export const delegate = (parent, selector, event, handler) => {
  parent.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) handler(e, target);
  });
};

/* ── XP float animation ───────────────────── */
export const floatXP = (amount, x, y) => {
  const span = document.createElement('span');
  span.className = 'xp-float';
  span.textContent = `+${amount} XP`;
  span.style.left = `${x}px`;
  span.style.top  = `${y}px`;
  document.body.appendChild(span);
  span.addEventListener('animationend', () => span.remove());
};
