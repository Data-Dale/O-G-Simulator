/* ─────────────────────────────────────────────
   screensaver.js — idle screensaver
   ───────────────────────────────────────────── */

import { formatClock, formatDate, el } from './utils.js';

let ssClockInterval = null;
let ssPhotoIndex    = 0;
let ssPhotoInterval = null;
let active          = false;

/* Placeholder photo backgrounds (gradient art) — replace with real photo URLs */
const SS_PHOTOS = [
  'linear-gradient(135deg, #0d1117 0%, #1a3a5c 50%, #0d2d45 100%)',
  'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #5c2a00 100%)',
  'linear-gradient(135deg, #0a1a00 0%, #1a3d00 50%, #2a5c00 100%)',
  'linear-gradient(135deg, #1a001a 0%, #3d003d 50%, #5c005c 100%)',
  'linear-gradient(135deg, #001a1a 0%, #003d3d 50%, #005c5c 100%)',
];

export function startScreensaver() {
  if (active) return;
  active = true;

  const ss = el('#screensaver');
  ss.classList.remove('hidden');
  ss.setAttribute('aria-hidden', 'false');

  // Build photo elements if not built
  const photosEl = el('#screensaver-photos');
  if (!photosEl.children.length) {
    SS_PHOTOS.forEach((bg, i) => {
      const div = document.createElement('div');
      div.className = 'ss-photo';
      div.style.background = bg;
      photosEl.appendChild(div);
    });
  }

  showPhoto(0);
  ssPhotoInterval = setInterval(() => {
    ssPhotoIndex = (ssPhotoIndex + 1) % SS_PHOTOS.length;
    showPhoto(ssPhotoIndex);
  }, 8000);

  // Clock update
  updateSSClock();
  ssClockInterval = setInterval(updateSSClock, 15000);

  // Tap to dismiss
  ss.addEventListener('click', stopScreensaver, { once: true });
  ss.addEventListener('touchstart', stopScreensaver, { once: true, passive: true });
}

export function stopScreensaver() {
  if (!active) return;
  active = false;

  const ss = el('#screensaver');
  ss.classList.add('hidden');
  ss.setAttribute('aria-hidden', 'true');

  clearInterval(ssClockInterval);
  clearInterval(ssPhotoInterval);
  ssClockInterval = null;
  ssPhotoInterval = null;
}

export function resetIdle() {
  // called externally to reset the idle timer (handled by app.js)
}

function showPhoto(idx) {
  const photos = el('#screensaver-photos').querySelectorAll('.ss-photo');
  photos.forEach((p, i) => p.classList.toggle('visible', i === idx));
}

function updateSSClock() {
  const timeEl = el('#screensaver-time');
  const dateEl = el('#screensaver-date');
  if (timeEl) timeEl.textContent = formatClock();
  if (dateEl) dateEl.textContent = formatDate(new Date(), 'long');
}
