'use strict';

/* =============================================================
   ROV PILOT SIMULATOR — config.js
   ROV definitions and environment definitions
   ============================================================= */

const ROV_CONFIGS = {

  'videoray-pro4': {
    id:           'videoray-pro4',
    name:         'VideoRay Pro 4',
    manufacturer: 'VideoRay LLC',
    class:        'Observation',
    classBadge:   'badge-observation',
    maxDepth:     305,
    speed:        '3.3 kn',
    thrusters:    3,
    weight:       '5.9 kg',
    power:        '300 W',
    hasManip:     false,
    description:
      'Compact micro-ROV ideal for hull inspection, port security, and confined-space surveys. ' +
      'Three-thruster configuration with front camera dome.',
    // Physics
    mass:         0.9,     // relative mass (affects acceleration)
    drag:         0.86,    // velocity decay per frame (0-1)
    angDrag:      0.88,
    maxSpeed:     1.6,     // m/s in scene units
    thrustPwr:    1.1,
    buoyancy:     0.012,   // slight positive buoyancy
    // Visuals
    bodyColor:    0x1a5fa8,
    accentColor:  0xffffff,
    scale:        0.42,
    // Tether properties
    tetherMax:    320,
    tetherColor:  0xffcc00,
    // Camera offsets [x,y,z] relative to ROV body
    pilotCamOffset:  [0, 0.05, -0.55],
    chaseCamOffset:  [0, 0.6,  2.2],
  },

  'schilling-uhd': {
    id:           'schilling-uhd',
    name:         'Schilling UHD',
    manufacturer: 'TechnipFMC Schilling Robotics',
    class:        'Work Class',
    classBadge:   'badge-work',
    maxDepth:     3000,
    speed:        '3.5 kn',
    thrusters:    8,
    weight:       '4,500 kg',
    power:        '150 kVA',
    hasManip:     true,
    manipFuncs:   7,
    description:
      'Industry-standard work-class ROV for deepwater intervention. ' +
      'Dual 7-function manipulators, modular tool skid, and 8 thrusters for precise positioning.',
    // Physics
    mass:         2.6,
    drag:         0.74,
    angDrag:      0.80,
    maxSpeed:     1.35,
    thrustPwr:    2.2,
    buoyancy:     0.0,
    // Visuals
    bodyColor:    0xff6600,
    accentColor:  0xffcc00,
    scale:        1.0,
    // Tether
    tetherMax:    3100,
    tetherColor:  0xffaa00,
    // Camera offsets
    pilotCamOffset:  [0, 0.15, -1.1],
    chaseCamOffset:  [0, 1.2,  4.5],
  },

  'seaeye-falcon': {
    id:           'seaeye-falcon',
    name:         'Saab Seaeye Falcon',
    manufacturer: 'Saab Seaeye Ltd',
    class:        'Inspection',
    classBadge:   'badge-inspection',
    maxDepth:     300,
    speed:        '3.0 kn',
    thrusters:    6,
    weight:       '62 kg',
    power:        '2.5 kW',
    hasManip:     false,
    description:
      'Highly manoeuvrable inspection-class ROV with 6 vectored thrusters. ' +
      'Widely deployed for offshore structure, pipeline, and mooring inspection.',
    // Physics
    mass:         1.2,
    drag:         0.83,
    angDrag:      0.86,
    maxSpeed:     1.55,
    thrustPwr:    1.4,
    buoyancy:     0.008,
    // Visuals
    bodyColor:    0xddbb00,
    accentColor:  0x222222,
    scale:        0.64,
    // Tether
    tetherMax:    320,
    tetherColor:  0xffee00,
    // Camera offsets
    pilotCamOffset:  [0, 0.06, -0.75],
    chaseCamOffset:  [0, 0.8,  3.0],
  },

  'millennium-plus': {
    id:           'millennium-plus',
    name:         'Oceaneering Millennium+',
    manufacturer: 'Oceaneering International',
    class:        'Heavy Work Class',
    classBadge:   'badge-heavy',
    maxDepth:     3048,
    speed:        '3.2 kn',
    thrusters:    8,
    weight:       '3,600 kg',
    power:        '125 kVA',
    hasManip:     true,
    manipFuncs:   7,
    description:
      'Proven deepwater heavy work-class platform with extensive Gulf of Mexico and North Sea history. ' +
      '8-thruster layout and large work deck for complex intervention tasks.',
    // Physics
    mass:         2.3,
    drag:         0.77,
    angDrag:      0.81,
    maxSpeed:     1.45,
    thrustPwr:    1.9,
    buoyancy:     0.0,
    // Visuals
    bodyColor:    0xee3300,
    accentColor:  0xffff00,
    scale:        0.95,
    // Tether
    tetherMax:    3200,
    tetherColor:  0xff8800,
    // Camera offsets
    pilotCamOffset:  [0, 0.1, -1.0],
    chaseCamOffset:  [0, 1.1,  4.2],
  },
};

/* ── ROV SVG Previews (for selection screen) ──────────────── */
const ROV_PREVIEWS = {
  'videoray-pro4': `
    <svg viewBox="0 0 200 80" class="rov-preview-svg" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="g1" cx="40%" cy="40%"><stop offset="0%" stop-color="#4488cc"/><stop offset="100%" stop-color="#112244"/></radialGradient></defs>
      <!-- Body torpedo -->
      <ellipse cx="105" cy="40" rx="55" ry="16" fill="url(#g1)" stroke="#336699" stroke-width="1"/>
      <!-- Nose dome -->
      <ellipse cx="52" cy="40" rx="10" ry="10" fill="#aaddff" opacity="0.5" stroke="#336699" stroke-width="1"/>
      <!-- Camera lens -->
      <circle cx="52" cy="40" r="5" fill="#112244" stroke="#88ccff" stroke-width="0.5"/>
      <circle cx="52" cy="40" r="2" fill="#66aaff"/>
      <!-- Top thruster -->
      <rect x="100" y="20" width="16" height="8" rx="2" fill="#0d3a6e" stroke="#336699" stroke-width="0.5"/>
      <ellipse cx="116" cy="24" rx="4" ry="4" fill="#0a2a50" stroke="#336699" stroke-width="0.5"/>
      <!-- Side thrusters -->
      <rect x="148" y="36" width="14" height="8" rx="2" fill="#0d3a6e" stroke="#336699" stroke-width="0.5" transform="rotate(15,155,40)"/>
      <rect x="148" y="36" width="14" height="8" rx="2" fill="#0d3a6e" stroke="#336699" stroke-width="0.5" transform="rotate(-15,155,40)"/>
      <!-- Tether -->
      <line x1="160" y1="40" x2="185" y2="30" stroke="#ffcc00" stroke-width="1.5" opacity="0.7"/>
      <!-- Light -->
      <circle cx="46" cy="33" r="3" fill="#ffe866" opacity="0.9"/>
      <circle cx="46" cy="47" r="3" fill="#ffe866" opacity="0.9"/>
      <!-- Label -->
      <text x="85" y="65" fill="#336699" font-family="Courier New" font-size="7" letter-spacing="1">VIDEORAY PRO 4</text>
    </svg>`,

  'schilling-uhd': `
    <svg viewBox="0 0 200 80" class="rov-preview-svg" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cc5500"/><stop offset="100%" stop-color="#662200"/></linearGradient></defs>
      <!-- Main frame -->
      <rect x="25" y="15" width="130" height="50" rx="2" fill="none" stroke="#ff6600" stroke-width="1" opacity="0.6"/>
      <!-- Floatation foam -->
      <rect x="30" y="16" width="120" height="14" rx="2" fill="#e8e0d0" opacity="0.85"/>
      <!-- Electronics pods -->
      <rect x="35" y="32" width="45" height="25" rx="2" fill="url(#g2)" stroke="#ff6600" stroke-width="0.8"/>
      <rect x="90" y="32" width="45" height="25" rx="2" fill="url(#g2)" stroke="#ff6600" stroke-width="0.8"/>
      <!-- Horizontal thrusters -->
      <ellipse cx="30"  cy="40" rx="5" ry="5" fill="#331100" stroke="#ff6600" stroke-width="0.8"/>
      <ellipse cx="155" cy="40" rx="5" ry="5" fill="#331100" stroke="#ff6600" stroke-width="0.8"/>
      <!-- Vertical thrusters -->
      <ellipse cx="55"  cy="64" rx="5" ry="4" fill="#331100" stroke="#ff6600" stroke-width="0.8"/>
      <ellipse cx="140" cy="64" rx="5" ry="4" fill="#331100" stroke="#ff6600" stroke-width="0.8"/>
      <!-- Manipulator arms -->
      <line x1="25" y1="48" x2="8"  y2="55" stroke="#ffcc00" stroke-width="2"/>
      <line x1="8"  y1="55" x2="5"  y2="62" stroke="#ffcc00" stroke-width="1.5"/>
      <line x1="25" y1="54" x2="8"  y2="60" stroke="#ffcc00" stroke-width="2"/>
      <line x1="8"  y1="60" x2="5"  y2="68" stroke="#ffcc00" stroke-width="1.5"/>
      <!-- Camera -->
      <rect x="26" y="35" width="10" height="7" rx="1" fill="#222" stroke="#888" stroke-width="0.5"/>
      <circle cx="31" cy="38.5" r="2.5" fill="#336699"/>
      <!-- Lights -->
      <circle cx="27" cy="33" r="2.5" fill="#ffe866" opacity="0.9"/>
      <!-- Label -->
      <text x="50" y="76" fill="#cc5500" font-family="Courier New" font-size="7" letter-spacing="1">SCHILLING UHD</text>
    </svg>`,

  'seaeye-falcon': `
    <svg viewBox="0 0 200 80" class="rov-preview-svg" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ccaa00"/><stop offset="100%" stop-color="#886600"/></linearGradient></defs>
      <!-- Frame -->
      <rect x="35" y="18" width="110" height="44" rx="3" fill="none" stroke="#ddbb00" stroke-width="1.2"/>
      <!-- Cross-members -->
      <line x1="90" y1="18" x2="90" y2="62" stroke="#ddbb00" stroke-width="0.6" opacity="0.5"/>
      <line x1="35" y1="40" x2="145" y2="40" stroke="#ddbb00" stroke-width="0.6" opacity="0.5"/>
      <!-- Electronics pod -->
      <rect x="50" y="24" width="80" height="32" rx="2" fill="url(#g3)" opacity="0.8"/>
      <!-- Camera dome -->
      <circle cx="47" cy="40" r="9" fill="#1a1a0a" stroke="#ddbb00" stroke-width="1"/>
      <circle cx="47" cy="40" r="5" fill="#336699" opacity="0.8"/>
      <circle cx="47" cy="40" r="2" fill="#88ccff"/>
      <!-- Thrusters (6) -->
      <ellipse cx="35"  cy="27" rx="5" ry="4" fill="#553300" stroke="#ddbb00" stroke-width="0.8"/>
      <ellipse cx="145" cy="27" rx="5" ry="4" fill="#553300" stroke="#ddbb00" stroke-width="0.8"/>
      <ellipse cx="35"  cy="53" rx="5" ry="4" fill="#553300" stroke="#ddbb00" stroke-width="0.8"/>
      <ellipse cx="145" cy="53" rx="5" ry="4" fill="#553300" stroke="#ddbb00" stroke-width="0.8"/>
      <ellipse cx="70"  cy="63" rx="4" ry="5" fill="#553300" stroke="#ddbb00" stroke-width="0.8"/>
      <ellipse cx="110" cy="63" rx="4" ry="5" fill="#553300" stroke="#ddbb00" stroke-width="0.8"/>
      <!-- Lights -->
      <circle cx="40" cy="35" r="2.5" fill="#ffe866" opacity="0.85"/>
      <circle cx="40" cy="45" r="2.5" fill="#ffe866" opacity="0.85"/>
      <!-- Label -->
      <text x="42" y="76" fill="#aaa000" font-family="Courier New" font-size="7" letter-spacing="1">SEAEYE FALCON</text>
    </svg>`,

  'millennium-plus': `
    <svg viewBox="0 0 200 80" class="rov-preview-svg" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cc3300"/><stop offset="100%" stop-color="#660000"/></linearGradient></defs>
      <!-- Main frame -->
      <rect x="20" y="12" width="145" height="56" rx="2" fill="none" stroke="#ee3300" stroke-width="1.1" opacity="0.7"/>
      <!-- Foam blocks on top -->
      <rect x="25"  y="13" width="60" height="12" rx="2" fill="#e0ddd0" opacity="0.9"/>
      <rect x="92"  y="13" width="60" height="12" rx="2" fill="#e0ddd0" opacity="0.9"/>
      <!-- Main housing -->
      <rect x="28" y="28" width="130" height="28" rx="2" fill="url(#g4)"/>
      <!-- Tool skid -->
      <rect x="28" y="58" width="130" height="8" rx="1" fill="#330000" stroke="#ee3300" stroke-width="0.6"/>
      <!-- Corner thrusters -->
      <ellipse cx="22"  cy="30" rx="5" ry="5" fill="#220000" stroke="#ee3300" stroke-width="0.8"/>
      <ellipse cx="163" cy="30" rx="5" ry="5" fill="#220000" stroke="#ee3300" stroke-width="0.8"/>
      <ellipse cx="22"  cy="54" rx="5" ry="5" fill="#220000" stroke="#ee3300" stroke-width="0.8"/>
      <ellipse cx="163" cy="54" rx="5" ry="5" fill="#220000" stroke="#ee3300" stroke-width="0.8"/>
      <!-- Vertical thrusters -->
      <ellipse cx="55"  cy="68" rx="5" ry="4" fill="#220000" stroke="#ee3300" stroke-width="0.8"/>
      <ellipse cx="130" cy="68" rx="5" ry="4" fill="#220000" stroke="#ee3300" stroke-width="0.8"/>
      <!-- Manipulator -->
      <line x1="20" y1="36" x2="3"  y2="42" stroke="#ffff00" stroke-width="2.2"/>
      <line x1="3"  y1="42" x2="2"  y2="50" stroke="#ffff00" stroke-width="1.5"/>
      <line x1="20" y1="44" x2="3"  y2="50" stroke="#ffff00" stroke-width="2.2"/>
      <line x1="3"  y1="50" x2="2"  y2="58" stroke="#ffff00" stroke-width="1.5"/>
      <!-- Camera cluster -->
      <rect x="22" y="30" width="12" height="9"  rx="1" fill="#111" stroke="#666" stroke-width="0.5"/>
      <circle cx="28" cy="34" r="3" fill="#336699" opacity="0.9"/>
      <!-- Lights -->
      <circle cx="23" cy="28" r="2.5" fill="#ffe866" opacity="0.9"/>
      <!-- Label -->
      <text x="40" y="76" fill="#aa2200" font-family="Courier New" font-size="7" letter-spacing="1">MILLENNIUM+</text>
    </svg>`,
};

/* ── Thruster layout labels for HUD ──────────────────────── */
const THRUSTER_LAYOUTS = {
  'videoray-pro4':    ['PORT H', 'STBD H', 'VERT'],
  'schilling-uhd':    ['FWD-P H', 'FWD-S H', 'AFT-P H', 'AFT-S H', 'FWD-P V', 'FWD-S V', 'AFT-P V', 'AFT-S V'],
  'seaeye-falcon':    ['FWD-P H', 'FWD-S H', 'AFT-P H', 'AFT-S H', 'PORT V', 'STBD V'],
  'millennium-plus':  ['FWD-P H', 'FWD-S H', 'AFT-P H', 'AFT-S H', 'FWD-P V', 'FWD-S V', 'AFT-P V', 'AFT-S V'],
};

/* ── Environment configs ──────────────────────────────────── */
const ENV_CONFIGS = {

  'shallow-pipeline': {
    id:          'shallow-pipeline',
    name:        'Shallow Pipeline Survey',
    icon:        '🔧',
    depthRange:  '15 – 50 m',
    description: 'North Sea seabed pipeline survey. Moderate visibility, check for free-spans and corrosion.',
    fogColor:    0x0d3040,
    fogDensity:  0.055,
    ambientCol:  0x1a3a5a,
    ambientInt:  0.35,
    sunCol:      0x4488bb,
    sunInt:      0.7,
    seabedY:    -40,
    seabedCol:   0x3a3020,
    waterHaze:   0x0d3040,
    spawnY:     -8,
    mission:     'pipeline',
    hasPipeline: true,
    hasWellhead: false,
    hasJacket:   false,
  },

  'deepwater-wellhead': {
    id:          'deepwater-wellhead',
    name:        'Deepwater Wellhead Ops',
    icon:        '⚙️',
    depthRange:  '800 – 1,200 m',
    description: 'Gulf of Mexico deepwater wellhead. Zero ambient light — ROV lighting critical. Valve intervention task.',
    fogColor:    0x010407,
    fogDensity:  0.14,
    ambientCol:  0x020406,
    ambientInt:  0.04,
    sunCol:      0x000000,
    sunInt:      0.0,
    seabedY:    -100,
    seabedCol:   0x1a1a14,
    waterHaze:   0x010407,
    spawnY:     -60,
    mission:     'valve',
    hasPipeline: false,
    hasWellhead: true,
    hasJacket:   false,
  },

  'platform-jacket': {
    id:          'platform-jacket',
    name:        'Platform Jacket Inspection',
    icon:        '🏗️',
    depthRange:  '30 – 80 m',
    description: 'North Sea production platform jacket. Inspect tubular members for marine growth, corrosion and damage.',
    fogColor:    0x163050,
    fogDensity:  0.04,
    ambientCol:  0x2a5080,
    ambientInt:  0.5,
    sunCol:      0x5599cc,
    sunInt:      0.85,
    seabedY:    -75,
    seabedCol:   0x2a2a1e,
    waterHaze:   0x163050,
    spawnY:     -15,
    mission:     'jacket',
    hasPipeline: false,
    hasWellhead: false,
    hasJacket:   true,
  },

  'free-dive': {
    id:          'free-dive',
    name:        'Free Exploration',
    icon:        '🌊',
    depthRange:  'Unrestricted',
    description: 'Open subsea area with no mission objectives. Explore freely and get familiar with the controls.',
    fogColor:    0x0d2840,
    fogDensity:  0.04,
    ambientCol:  0x1a4060,
    ambientInt:  0.45,
    sunCol:      0x3366aa,
    sunInt:      0.75,
    seabedY:    -60,
    seabedCol:   0x2e2a1a,
    waterHaze:   0x0d2840,
    spawnY:     -10,
    mission:     null,
    hasPipeline: true,
    hasWellhead: false,
    hasJacket:   false,
  },
};

/* ── Mission definitions ──────────────────────────────────── */
const MISSIONS = {
  pipeline: {
    title: 'Pipeline Survey',
    objectives: [
      { id: 'approach',   text: 'Approach the pipeline (< 5 m)' },
      { id: 'survey-a',   text: 'Survey Section A (fly along length)' },
      { id: 'survey-b',   text: 'Survey Section B (fly along length)' },
      { id: 'anomaly',    text: 'Inspect the corrosion anomaly' },
      { id: 'return',     text: 'Return to LARS position' },
    ],
  },
  valve: {
    title: 'Valve Intervention',
    objectives: [
      { id: 'locate',     text: 'Locate the wellhead structure' },
      { id: 'approach',   text: 'Approach intervention panel' },
      { id: 'valve1',     text: 'Operate valve 1 (close)' },
      { id: 'valve2',     text: 'Operate valve 2 (open)' },
      { id: 'confirm',    text: 'Confirm valve positions' },
    ],
  },
  jacket: {
    title: 'Jacket Inspection',
    objectives: [
      { id: 'node-a',     text: 'Inspect Node A (SW corner)' },
      { id: 'node-b',     text: 'Inspect Node B (SE corner)' },
      { id: 'anode',      text: 'Locate sacrificial anode' },
      { id: 'crack',      text: 'Record crack indication' },
      { id: 'return',     text: 'Return to surface' },
    ],
  },
};
