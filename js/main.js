'use strict';

/* =============================================================
   ROV PILOT SIMULATOR — main.js
   Selection screen, Three.js scene, physics, input, HUD,
   missions, game loop.
   ============================================================= */

const SimApp = (() => {

  /* ── State ─────────────────────────────────────────────────── */
  let state = {
    selectedROV:  null,
    selectedEnv:  null,
    running:      false,
    paused:       false,
    lightsOn:     false,
    startTime:    0,
    elapsed:      0,
    camera:       0,   // 0=pilot, 1=chase, 2=overhead
    manipOpen:    false,
  };

  /* ── Three.js objects ──────────────────────────────────────── */
  let renderer, scene, camera, rovGroup, envExtras;

  /* ── Physics state ─────────────────────────────────────────── */
  const phy = {
    vel:     new THREE.Vector3(),  // m/s (scene units)
    angVel:  new THREE.Vector3(),  // rad/s
    pos:     new THREE.Vector3(),  // position
    rot:     new THREE.Euler(0, 0, 0, 'YXZ'),
  };

  /* ── Input ─────────────────────────────────────────────────── */
  const keys = {};

  /* ── Gamepad state ─────────────────────────────────────────── */
  // Xbox controller uses the W3C Standard Gamepad layout:
  //   Axes  0/1 = left stick X/Y,  2/3 = right stick X/Y
  //   Btn 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT, 9=Start
  const gp = {
    index:    -1,
    connected: false,
    axes:     [0, 0, 0, 0],
    buttons:  [],
    prevBtns: [],
    DEADZONE: 0.12,
  };

  /* ── Mission state ─────────────────────────────────────────── */
  let missionDef   = null;
  let missionState = {};  // id -> bool

  /* ── Tether ────────────────────────────────────────────────── */
  let tetherLine = null;
  const LARS_POS = new THREE.Vector3(0, 0, 0);  // LARS position (set on launch)

  /* ── Thruster input axes — keyboard + gamepad merged ────────── */
  // surge (+fwd), sway (+stbd), heave (+up), yaw (+cw), pitch (+nose down), roll (+stbd down)
  function getAxes() {
    // ── Keyboard ──
    const kSurge = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const kSway  = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    const kHeave = (keys['KeyR'] ? 1 : 0) - (keys['KeyF'] ? 1 : 0);
    const kYaw   = (keys['KeyE'] ? 1 : 0) - (keys['KeyQ'] ? 1 : 0);
    const kPitch = (keys['KeyG'] ? 1 : 0) - (keys['KeyT'] ? 1 : 0);
    const kRoll  = (keys['KeyX'] ? 1 : 0) - (keys['KeyZ'] ? 1 : 0);

    if (!gp.connected) {
      return { surge: kSurge, sway: kSway, heave: kHeave, yaw: kYaw, pitch: kPitch, roll: kRoll };
    }

    // ── Gamepad analog ──
    const dz = v => Math.abs(v) < gp.DEADZONE ? 0 : v;

    const gpSurge =  -dz(gp.axes[1]);                          // left  Y: push up = forward
    const gpSway  =   dz(gp.axes[0]);                          // left  X: right = stbd
    const gpYaw   =   dz(gp.axes[2]);                          // right X: right = yaw CW
    const gpPitch =   dz(gp.axes[3]);                          // right Y: push up = nose up (negated below)
    const gpHeave =  (gp.buttons[7]?.value ?? 0)               // RT: heave up
                   - (gp.buttons[6]?.value ?? 0);              // LT: heave down
    const gpRoll  =  (gp.buttons[5]?.pressed ? 1 : 0)         // RB: roll stbd
                   - (gp.buttons[4]?.pressed ? 1 : 0);         // LB: roll port

    const clamp = (a, b) => Math.max(-1, Math.min(1, a + b));
    return {
      surge: clamp(kSurge, gpSurge),
      sway:  clamp(kSway,  gpSway),
      heave: clamp(kHeave, gpHeave),
      yaw:   clamp(kYaw,   gpYaw),
      pitch: clamp(kPitch, -gpPitch),   // right Y down = nose down
      roll:  clamp(kRoll,  gpRoll),
    };
  }

  /* ── Per-ROV thruster contributions ────────────────────────── */
  /* Returns an array of [-1..1] per thruster channel given movement axes */
  function calcThrusterValues(rovId, axes) {
    const { surge, sway, heave, yaw, pitch, roll } = axes;
    switch (rovId) {
      case 'videoray-pro4':
        // 3 thrusters: [Port H, Stbd H, Vertical]
        return [
          surge + yaw * 0.5,                // Port H
          surge - yaw * 0.5,                // Stbd H
          heave,                            // Vertical
        ];
      case 'schilling-uhd':
      case 'millennium-plus':
        // 8 thrusters: [FP-H, FS-H, AP-H, AS-H, FP-V, FS-V, AP-V, AS-V]
        return [
          surge + sway * 0.5 + yaw * 0.5,  // FWD Port H
          surge - sway * 0.5 - yaw * 0.5,  // FWD Stbd H
          surge + sway * 0.5 - yaw * 0.5,  // AFT Port H
          surge - sway * 0.5 + yaw * 0.5,  // AFT Stbd H
          heave + pitch * 0.4,              // FWD Port V
          heave + pitch * 0.4,              // FWD Stbd V
          heave - pitch * 0.4,              // AFT Port V
          heave - pitch * 0.4,              // AFT Stbd V
        ];
      case 'seaeye-falcon':
        // 6 thrusters: [FP-H, FS-H, AP-H, AS-H, Port-V, Stbd-V]
        return [
          surge + sway * 0.5 + yaw * 0.5,
          surge - sway * 0.5 - yaw * 0.5,
          surge + sway * 0.5 - yaw * 0.5,
          surge - sway * 0.5 + yaw * 0.5,
          heave + roll * 0.4,
          heave - roll * 0.4,
        ];
      default:
        return [surge, heave];
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SELECTION SCREEN
     ═══════════════════════════════════════════════════════════ */

  function initSelectionScreen() {
    // Build ROV cards
    const grid = document.getElementById('rov-grid');
    Object.values(ROV_CONFIGS).forEach(cfg => {
      const card = document.createElement('div');
      card.className = 'rov-card';
      card.dataset.id = cfg.id;
      card.style.setProperty('--card-accent', '#' + cfg.bodyColor.toString(16).padStart(6, '0'));

      card.innerHTML = `
        <div class="rov-card-accent"></div>
        <div class="rov-card-header">
          <div class="rov-card-name">${cfg.name}</div>
          <div class="rov-badge ${cfg.classBadge}">${cfg.class}</div>
        </div>
        <div class="rov-card-mfr">${cfg.manufacturer}</div>
        <div class="rov-card-preview">${ROV_PREVIEWS[cfg.id] || ''}</div>
        <div class="rov-card-desc">${cfg.description}</div>
        <div class="rov-specs-grid">
          <div class="spec-row"><span class="spec-lbl">MAX DEPTH</span><span class="spec-val">${cfg.maxDepth} m</span></div>
          <div class="spec-row"><span class="spec-lbl">MAX SPEED</span><span class="spec-val">${cfg.speed}</span></div>
          <div class="spec-row"><span class="spec-lbl">THRUSTERS</span><span class="spec-val">${cfg.thrusters}</span></div>
          <div class="spec-row"><span class="spec-lbl">WEIGHT</span><span class="spec-val">${cfg.weight}</span></div>
          <div class="spec-row"><span class="spec-lbl">POWER</span><span class="spec-val">${cfg.power}</span></div>
          <div class="spec-row"><span class="spec-lbl">MANIP</span><span class="spec-val">${cfg.hasManip ? `Yes (${cfg.manipFuncs}-func)` : 'No'}</span></div>
        </div>`;

      card.addEventListener('click', () => selectROV(cfg.id));
      grid.appendChild(card);
    });

    // Build Environment cards
    const envGrid = document.getElementById('env-grid');
    Object.values(ENV_CONFIGS).forEach(cfg => {
      const card = document.createElement('div');
      card.className = 'env-card';
      card.dataset.id = cfg.id;
      card.innerHTML = `
        <div class="env-card-icon">${cfg.icon}</div>
        <div class="env-card-name">${cfg.name}</div>
        <div class="env-card-depth">${cfg.depthRange}</div>
        <div class="env-card-desc">${cfg.description}</div>`;
      card.addEventListener('click', () => selectEnv(cfg.id));
      envGrid.appendChild(card);
    });

    document.getElementById('launch-btn').addEventListener('click', launchSimulation);
  }

  function selectROV(id) {
    state.selectedROV = id;
    document.querySelectorAll('.rov-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
    updateLaunchState();
  }

  function selectEnv(id) {
    state.selectedEnv = id;
    document.querySelectorAll('.env-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
    updateLaunchState();
  }

  function updateLaunchState() {
    const btn = document.getElementById('launch-btn');
    const sum = document.getElementById('sel-summary');
    btn.disabled = !(state.selectedROV && state.selectedEnv);
    if (state.selectedROV && state.selectedEnv) {
      const r = ROV_CONFIGS[state.selectedROV];
      const e = ENV_CONFIGS[state.selectedEnv];
      sum.textContent = `${r.name}  ·  ${e.name}`;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     LAUNCH / INIT THREE.JS
     ═══════════════════════════════════════════════════════════ */

  function launchSimulation() {
    document.getElementById('selection-screen').classList.add('hidden');
    document.getElementById('simulator-screen').classList.remove('hidden');
    initThreeJS();
    initHUD();
    initMission();
    initInput();
    state.running  = true;
    state.paused   = false;
    state.startTime = performance.now();
    animate();
  }

  function initThreeJS() {
    const canvas = document.getElementById('rov-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;

    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 600);

    // Build environment
    envExtras = Environment.build(scene, state.selectedEnv);

    // Build ROV
    const rovCfg = ROV_CONFIGS[state.selectedROV];
    rovGroup = ROVBuilder.build(state.selectedROV);
    rovGroup.scale.setScalar(rovCfg.scale);
    scene.add(rovGroup);

    // Set spawn position
    const envCfg = ENV_CONFIGS[state.selectedEnv];
    phy.pos.set(0, envCfg.spawnY, 0);
    phy.rot.set(0, 0, 0);
    phy.vel.set(0, 0, 0);
    phy.angVel.set(0, 0, 0);
    rovGroup.position.copy(phy.pos);

    LARS_POS.set(0, envCfg.spawnY + 3, 10);

    // Tether line
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([LARS_POS, phy.pos]);
    const tetherMat = new THREE.LineBasicMaterial({ color: rovCfg.tetherColor, opacity: 0.6, transparent: true });
    tetherLine = new THREE.Line(tetherGeo, tetherMat);
    scene.add(tetherLine);

    window.addEventListener('resize', onResize);
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /* ═══════════════════════════════════════════════════════════
     INPUT
     ═══════════════════════════════════════════════════════════ */

  function initInput() {
    window.addEventListener('keydown', e => {
      keys[e.code] = true;

      if (e.code === 'KeyL')   toggleLights();
      if (e.code === 'KeyC')   cycleCam();
      if (e.code === 'KeyM')   toggleManip();
      if (e.code === 'Escape') togglePause();
    });

    window.addEventListener('keyup', e => { keys[e.code] = false; });

    // Gamepad connect / disconnect
    window.addEventListener('gamepadconnected', e => {
      gp.index     = e.gamepad.index;
      gp.connected = true;
      gp.prevBtns  = [];
      updateGPHUD(true, e.gamepad.id);
      showAlert('CONTROLLER CONNECTED — XBOX LAYOUT ACTIVE', 'alert-success');
    });

    window.addEventListener('gamepaddisconnected', e => {
      if (e.gamepad.index === gp.index) {
        gp.index     = -1;
        gp.connected = false;
        gp.axes      = [0, 0, 0, 0];
        gp.buttons   = [];
        gp.prevBtns  = [];
        updateGPHUD(false);
        showAlert('CONTROLLER DISCONNECTED', 'alert-warning');
      }
    });
  }

  function toggleLights() {
    state.lightsOn = !state.lightsOn;
    const lights = rovGroup?.userData?.lights;
    if (lights) {
      lights.forEach(pl => {
        pl.intensity = state.lightsOn ? 2.5 : 0;
        if (pl.userData.lens) {
          pl.userData.lens.material.emissiveIntensity = state.lightsOn ? 1.5 : 0;
        }
      });
    }
    // Update HUD
    document.getElementById('lp1')?.classList.toggle('on', state.lightsOn);
    document.getElementById('lp2')?.classList.toggle('on', state.lightsOn);
    const ll = document.getElementById('light-label');
    if (ll) ll.textContent = `LIGHTS: ${state.lightsOn ? 'ON' : 'OFF'}`;

    const envCfg = ENV_CONFIGS[state.selectedEnv];
    if (envCfg?.sunInt < 0.1) {
      showAlert(state.lightsOn ? 'ROV LIGHTING ACTIVE' : 'ROV LIGHTING OFF — ZERO VISIBILITY', state.lightsOn ? 'alert-success' : 'alert-warning');
    }
  }

  function cycleCam() {
    state.camera = (state.camera + 1) % 3;
    updateCamButtons();
  }

  function toggleManip() {
    const rovCfg = ROV_CONFIGS[state.selectedROV];
    if (!rovCfg.hasManip) {
      showAlert('NO MANIPULATOR ON THIS ROV', 'alert-warning');
      return;
    }
    state.manipOpen = !state.manipOpen;
    showAlert(`MANIPULATOR: ${state.manipOpen ? 'DEPLOYED' : 'STOWED'}`, 'alert-info');
  }

  /* ─── Gamepad polling (called every frame) ────────────────── */
  // The Gamepad API requires polling via navigator.getGamepads() each frame;
  // events alone are unreliable for axis values.
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Try to pick up a newly connected pad if none tracked yet
    if (!gp.connected) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i]) { gp.index = i; gp.connected = true; updateGPHUD(true, pads[i].id); break; }
      }
      return;
    }

    const pad = pads[gp.index];
    if (!pad) return;   // pad momentarily unavailable — keep waiting

    // Refresh axes
    for (let i = 0; i < 4 && i < pad.axes.length; i++) gp.axes[i] = pad.axes[i];

    // Refresh all button objects (needed for .value on triggers)
    gp.buttons = pad.buttons;

    // Button edge detection — rising edge only, so one press = one action
    const TOGGLE_BTNS = {
      0: toggleLights,   // A  → lights
      1: cycleCam,       // B  → cycle camera
      2: toggleManip,    // X  → manipulator
      9: togglePause,    // Start → pause
    };

    Object.entries(TOGGLE_BTNS).forEach(([idx, fn]) => {
      const i   = Number(idx);
      const cur  = pad.buttons[i]?.pressed ?? false;
      const prev = gp.prevBtns[i]          ?? false;
      if (cur && !prev) fn();
    });

    // Store previous button states
    gp.prevBtns = pad.buttons.map(b => b.pressed);
  }

  function updateGPHUD(connected, id = '') {
    const el  = document.getElementById('gp-status');
    if (!el) return;
    el.classList.toggle('gp-connected', connected);
    // Shorten verbose browser ID strings to something readable
    const label = connected
      ? (id.toLowerCase().includes('xbox') ? 'XBOX' :
         id.toLowerCase().includes('054c') ? 'PS'   : 'CTRL')
      : 'NO CTRL';
    el.querySelector('.gp-label').textContent = label;
    el.title = id || 'No controller';
  }

  /* ═══════════════════════════════════════════════════════════
     PHYSICS UPDATE
     ═══════════════════════════════════════════════════════════ */

  function updatePhysics(dt) {
    const rovCfg = ROV_CONFIGS[state.selectedROV];
    const envCfg = ENV_CONFIGS[state.selectedEnv];
    const axes   = getAxes();

    // ── Thrust forces in local ROV frame ──
    const localForce = new THREE.Vector3(
      axes.sway  * rovCfg.thrustPwr,
      axes.heave * rovCfg.thrustPwr + rovCfg.buoyancy,
      -axes.surge * rovCfg.thrustPwr  // -Z is forward in Three.js
    );

    // ── Transform to world frame ──
    const worldForce = localForce.clone().applyEuler(phy.rot);
    phy.vel.addScaledVector(worldForce, dt / rovCfg.mass);

    // ── Drag ──
    phy.vel.multiplyScalar(Math.pow(rovCfg.drag, dt * 60));

    // ── Clamp speed ──
    const spd = phy.vel.length();
    if (spd > rovCfg.maxSpeed) phy.vel.multiplyScalar(rovCfg.maxSpeed / spd);

    // ── Integrate position ──
    phy.pos.addScaledVector(phy.vel, dt);

    // ── Angular ──
    phy.angVel.x += axes.pitch * rovCfg.thrustPwr * 0.6 * dt / rovCfg.mass;
    phy.angVel.y += axes.yaw   * rovCfg.thrustPwr * 0.6 * dt / rovCfg.mass;
    phy.angVel.z -= axes.roll  * rovCfg.thrustPwr * 0.4 * dt / rovCfg.mass;
    phy.angVel.multiplyScalar(Math.pow(rovCfg.angDrag, dt * 60));

    // Clamp angular velocity
    const maxAng = 1.2;
    if (phy.angVel.length() > maxAng) phy.angVel.setLength(maxAng);

    phy.rot.x += phy.angVel.x * dt;
    phy.rot.y += phy.angVel.y * dt;
    phy.rot.z += phy.angVel.z * dt;

    // ── Pitch/roll self-righting (slight tendency to level) ──
    phy.rot.x *= 0.998;
    phy.rot.z *= 0.996;

    // ── Depth floor ──
    if (phy.pos.y < envCfg.seabedY + 0.3) {
      phy.pos.y = envCfg.seabedY + 0.3;
      phy.vel.y = Math.max(0, phy.vel.y);
    }

    // ── Depth ceiling ──
    if (phy.pos.y > 2) {
      phy.pos.y = 2;
      phy.vel.y = Math.min(0, phy.vel.y);
    }

    // ── Apply to ROV group ──
    rovGroup.position.copy(phy.pos);
    rovGroup.rotation.copy(phy.rot);

    // ── Tether ──
    updateTether();

    // ── Depth warning ──
    const depthRatio = Math.abs(phy.pos.y) / Math.abs(envCfg.seabedY);
    const dw = document.getElementById('depth-warn');
    if (dw) dw.classList.toggle('hidden', depthRatio < 0.88);
  }

  function updateTether() {
    if (!tetherLine) return;
    const pts = [LARS_POS, phy.pos];
    tetherLine.geometry.setFromPoints(pts);
    tetherLine.geometry.computeBoundingSphere();
  }

  /* ═══════════════════════════════════════════════════════════
     CAMERA UPDATE
     ═══════════════════════════════════════════════════════════ */

  function updateCamera() {
    const rovCfg = ROV_CONFIGS[state.selectedROV];

    if (state.camera === 0) {
      // Pilot cam — attached at front of ROV
      const off = rovCfg.pilotCamOffset;
      const local = new THREE.Vector3(off[0], off[1], off[2]);
      const world = local.applyEuler(phy.rot).add(phy.pos);
      camera.position.copy(world);
      camera.rotation.copy(phy.rot);

    } else if (state.camera === 1) {
      // Chase cam — smooth follow behind ROV
      const off = rovCfg.chaseCamOffset;
      const localOffset = new THREE.Vector3(off[0], off[1], off[2]);
      const worldOffset = localOffset.applyEuler(phy.rot);
      const target = phy.pos.clone().add(worldOffset);
      camera.position.lerp(target, 0.08);
      camera.lookAt(phy.pos);

    } else {
      // Overhead cam
      camera.position.set(phy.pos.x, phy.pos.y + 12, phy.pos.z + 4);
      camera.lookAt(phy.pos);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     HUD
     ═══════════════════════════════════════════════════════════ */

  /* ── ROV top-view diagram definitions ───────────────────── */
  const DIAGRAM_DEFS = {
    'videoray-pro4': {
      viewBox: '0 0 180 90',
      body: `
        <ellipse cx="85" cy="45" rx="46" ry="14" fill="#141e28" stroke="#2c3c4c" stroke-width="1.2"/>
        <ellipse cx="41" cy="45" rx="12" ry="12" fill="#0e1820" stroke="#2c3c4c" stroke-width="1"/>
        <rect x="122" y="41" width="8" height="8" rx="1" fill="#0e1820" stroke="#2c3c4c"/>
        <text x="90" y="80" fill="#2e3e4e" font-size="7" font-family="system-ui,Arial" text-anchor="middle" letter-spacing="1">VIDEORAY PRO 4</text>`,
      thrusters: [
        { id:'td-0', type:'circle',  cx:130, cy:34, r:7 },
        { id:'td-1', type:'circle',  cx:130, cy:56, r:7 },
        { id:'td-2', type:'diamond', cx:85,  cy:24, r:6 },
      ],
    },
    'schilling-uhd': {
      viewBox: '0 0 210 110',
      body: `
        <rect x="30" y="22" width="150" height="66" fill="none" stroke="#2c3c4c" stroke-width="1.2"/>
        <rect x="36" y="24" width="138" height="62" fill="#141e28" opacity="0.7"/>
        <rect x="44" y="14" width="52" height="11" rx="1" fill="#1a2530" stroke="#2c3c4c"/>
        <rect x="114" y="14" width="52" height="11" rx="1" fill="#1a2530" stroke="#2c3c4c"/>
        <line x1="30" y1="55" x2="180" y2="55" stroke="#2c3c4c" stroke-width="0.7" stroke-dasharray="4,3"/>
        <text x="105" y="100" fill="#2e3e4e" font-size="7" font-family="system-ui,Arial" text-anchor="middle" letter-spacing="1">SCHILLING UHD</text>`,
      thrusters: [
        { id:'td-0', type:'circle', cx:30,  cy:36, r:8 },
        { id:'td-1', type:'circle', cx:180, cy:36, r:8 },
        { id:'td-2', type:'circle', cx:30,  cy:74, r:8 },
        { id:'td-3', type:'circle', cx:180, cy:74, r:8 },
        { id:'td-4', type:'square', cx:54,  cy:14, r:6 },
        { id:'td-5', type:'square', cx:156, cy:14, r:6 },
        { id:'td-6', type:'square', cx:54,  cy:91, r:6 },
        { id:'td-7', type:'square', cx:156, cy:91, r:6 },
      ],
    },
    'seaeye-falcon': {
      viewBox: '0 0 190 100',
      body: `
        <rect x="26" y="18" width="138" height="64" fill="none" stroke="#2c3c4c" stroke-width="1.2"/>
        <rect x="40" y="26" width="110" height="48" fill="#141e28" opacity="0.7"/>
        <ellipse cx="38" cy="50" rx="13" ry="13" fill="#0e1820" stroke="#2c3c4c" stroke-width="1"/>
        <circle cx="38" cy="50" r="6" fill="#1a2530"/>
        <text x="95" y="94" fill="#2e3e4e" font-size="7" font-family="system-ui,Arial" text-anchor="middle" letter-spacing="1">SEAEYE FALCON</text>`,
      thrusters: [
        { id:'td-0', type:'circle',  cx:26,  cy:30, r:8 },
        { id:'td-1', type:'circle',  cx:164, cy:30, r:8 },
        { id:'td-2', type:'circle',  cx:26,  cy:70, r:8 },
        { id:'td-3', type:'circle',  cx:164, cy:70, r:8 },
        { id:'td-4', type:'diamond', cx:72,  cy:86, r:7 },
        { id:'td-5', type:'diamond', cx:118, cy:86, r:7 },
      ],
    },
    'millennium-plus': {
      viewBox: '0 0 210 110',
      body: `
        <rect x="28" y="20" width="154" height="68" fill="none" stroke="#2c3c4c" stroke-width="1.2"/>
        <rect x="34" y="22" width="142" height="64" fill="#141e28" opacity="0.7"/>
        <rect x="42" y="12" width="56" height="11" rx="1" fill="#1a2530" stroke="#2c3c4c"/>
        <rect x="112" y="12" width="56" height="11" rx="1" fill="#1a2530" stroke="#2c3c4c"/>
        <line x1="28" y1="54" x2="182" y2="54" stroke="#2c3c4c" stroke-width="0.7" stroke-dasharray="4,3"/>
        <text x="105" y="100" fill="#2e3e4e" font-size="7" font-family="system-ui,Arial" text-anchor="middle" letter-spacing="1">MILLENNIUM+</text>`,
      thrusters: [
        { id:'td-0', type:'circle', cx:28,  cy:34, r:8 },
        { id:'td-1', type:'circle', cx:182, cy:34, r:8 },
        { id:'td-2', type:'circle', cx:28,  cy:74, r:8 },
        { id:'td-3', type:'circle', cx:182, cy:74, r:8 },
        { id:'td-4', type:'square', cx:52,  cy:12, r:6 },
        { id:'td-5', type:'square', cx:158, cy:12, r:6 },
        { id:'td-6', type:'square', cx:52,  cy:93, r:6 },
        { id:'td-7', type:'square', cx:158, cy:93, r:6 },
      ],
    },
  };

  function buildROVDiagramSVG(rovId) {
    const def = DIAGRAM_DEFS[rovId] || DIAGRAM_DEFS['videoray-pro4'];
    const idle = '#1e2c3c'; const idleStroke = '#2e4054';

    const thrSVG = def.thrusters.map(t => {
      if (t.type === 'circle') {
        return `<circle id="${t.id}" cx="${t.cx}" cy="${t.cy}" r="${t.r}" fill="${idle}" stroke="${idleStroke}" stroke-width="1.2"/>`;
      } else if (t.type === 'square') {
        return `<rect id="${t.id}" x="${t.cx-t.r}" y="${t.cy-t.r}" width="${t.r*2}" height="${t.r*2}" fill="${idle}" stroke="${idleStroke}" stroke-width="1.2"/>`;
      } else {
        const r = t.r;
        return `<polygon id="${t.id}" points="${t.cx},${t.cy-r} ${t.cx+r},${t.cy} ${t.cx},${t.cy+r} ${t.cx-r},${t.cy}" fill="${idle}" stroke="${idleStroke}" stroke-width="1.2"/>`;
      }
    }).join('');

    return `<svg viewBox="${def.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <defs>
        <filter id="gfwd" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="grev" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      ${def.body}
      ${thrSVG}
    </svg>`;
  }

  function updateVehicleDiagram(thrVals) {
    thrVals.forEach((v, i) => {
      const el = document.getElementById(`td-${i}`);
      if (!el) return;
      const abs = Math.abs(v);
      if (abs < 0.05) {
        el.setAttribute('fill', '#1e2c3c');
        el.setAttribute('stroke', '#2e4054');
        el.removeAttribute('filter');
      } else if (v > 0) {
        const a = (0.3 + abs * 0.7).toFixed(2);
        el.setAttribute('fill', `rgba(39,199,110,${a})`);
        el.setAttribute('stroke', '#27c76e');
        el.setAttribute('filter', 'url(#gfwd)');
      } else {
        const a = (0.3 + abs * 0.7).toFixed(2);
        el.setAttribute('fill', `rgba(224,68,68,${a})`);
        el.setAttribute('stroke', '#e04444');
        el.setAttribute('filter', 'url(#grev)');
      }
    });
  }

  function initHUD() {
    const rovCfg = ROV_CONFIGS[state.selectedROV];

    // Header vehicle name
    document.getElementById('hud-rov-id').textContent = rovCfg.name.toUpperCase();

    // Thruster bars (in THRUSTERS tab)
    const labels = THRUSTER_LAYOUTS[state.selectedROV] || [];
    const container = document.getElementById('thruster-display');
    container.innerHTML = '';
    labels.forEach((lbl, i) => {
      container.innerHTML += `
        <div class="hh-thr-item">
          <div class="hh-thr-lbl">${lbl}</div>
          <div class="thr-track">
            <div class="thr-center"></div>
            <div class="thr-fill" id="thr-fill-${i}"></div>
          </div>
          <div class="hh-thr-pct" id="thr-pct-${i}">0%</div>
        </div>`;
    });

    // ROV diagram in left panel
    const diagEl = document.getElementById('rov-diagram');
    if (diagEl) diagEl.innerHTML = buildROVDiagramSVG(state.selectedROV);

    // Init bottom tabs + camera buttons
    initTabs();
    updateCamButtons();

    // Depth scale reset
    const df = document.getElementById('depth-fill');
    if (df) df.style.height = '0%';
  }

  function initTabs() {
    document.querySelectorAll('.hh-btab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hh-btab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.hh-bpane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById('btab-' + btn.dataset.btab);
        if (pane) pane.classList.add('active');
      });
    });

    document.querySelectorAll('.hh-cam-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.camera = parseInt(btn.dataset.cam);
        updateCamButtons();
      });
    });
  }

  function updateCamButtons() {
    const names = ['CAM 1 · PILOT', 'CAM 2 · CHASE', 'CAM 3 · OVERHEAD'];
    document.querySelectorAll('.hh-cam-btn').forEach(btn => {
      const active = parseInt(btn.dataset.cam) === state.camera;
      btn.classList.toggle('active', active);
      const badge = btn.querySelector('.hh-cam-badge');
      if (badge) badge.textContent = active ? 'ACTIVE' : 'STBY';
    });
    const lbl = document.getElementById('hud-cam-label');
    if (lbl) lbl.textContent = names[state.camera] || 'CAM';
  }

  function updateHUD(dt) {
    const rovCfg = ROV_CONFIGS[state.selectedROV];
    const envCfg = ENV_CONFIGS[state.selectedEnv];
    const axes   = getAxes();

    // ── Timer ──
    state.elapsed = (performance.now() - state.startTime) / 1000;
    const h = Math.floor(state.elapsed / 3600);
    const m = Math.floor((state.elapsed % 3600) / 60);
    const s = Math.floor(state.elapsed % 60);
    document.getElementById('hud-timer').textContent =
      `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    // ── Depth ──
    const depth = -phy.pos.y;
    document.getElementById('depth-readout').textContent = depth.toFixed(1) + ' m';
    const maxDepth = Math.abs(envCfg.seabedY);
    const depthPct = Math.min(100, (depth / maxDepth) * 100);
    const ind = document.getElementById('depth-ind');
    if (ind) ind.style.top = depthPct.toFixed(1) + '%';
    const fill = document.getElementById('depth-fill');
    if (fill) fill.style.height = depthPct.toFixed(1) + '%';

    // ── Heading ──
    const hdgRad = phy.rot.y;
    const hdgDeg = ((hdgRad * 180 / Math.PI) % 360 + 360) % 360;
    document.getElementById('hdg-val').textContent = `HDG ${Math.round(hdgDeg).toString().padStart(3,'0')}°`;
    const needleWrap = document.getElementById('compass-needle-wrap');
    if (needleWrap) needleWrap.style.transform = `rotate(${-hdgDeg}deg)`;

    // ── Pitch & Roll ──
    const pitchDeg = (phy.rot.x * 180 / Math.PI).toFixed(1);
    const rollDeg  = (phy.rot.z * 180 / Math.PI).toFixed(1);
    document.getElementById('a-pitch').textContent = (pitchDeg >= 0 ? '+' : '') + pitchDeg + '°';
    document.getElementById('a-roll').textContent  = (rollDeg >= 0 ? '+' : '') + rollDeg  + '°';

    // ── Artificial horizon ──
    const ahInner = document.getElementById('ah-inner');
    if (ahInner) {
      ahInner.style.transform =
        `rotate(${-(phy.rot.z * 180 / Math.PI).toFixed(2)}deg) ` +
        `translateY(${(phy.rot.x * 60).toFixed(2)}px)`;
    }

    // ── Sensors ──
    // Temperature increases with depth (roughly)
    const temp = (4 + depth * 0.01 + Math.sin(state.elapsed * 0.03) * 0.2).toFixed(1);
    document.getElementById('s-temp').textContent = temp + ' °C';
    const pressure = (1 + depth * 0.0981).toFixed(2);
    document.getElementById('s-pres').textContent = pressure + ' bar';
    document.getElementById('s-salt').textContent = (34.8 + Math.random() * 0.04).toFixed(1) + ' ppt';

    // Altitude above seabed
    const alt = (phy.pos.y - envCfg.seabedY).toFixed(1);
    document.getElementById('s-alt').textContent = alt + ' m';

    // ── Speed ──
    const speedKn = (phy.vel.length() * 1.944).toFixed(2);
    document.getElementById('speed-val').textContent = speedKn + ' kn';

    // ── Thrusters ──
    const thrVals = calcThrusterValues(state.selectedROV, axes);
    thrVals.forEach((v, i) => {
      const fill = document.getElementById(`thr-fill-${i}`);
      if (!fill) return;
      const pct = Math.min(50, Math.abs(v) * 50);
      fill.className = 'thr-fill ' + (v >= 0 ? 'fwd' : 'rev');
      fill.style.width = pct + '%';
      const pctEl = document.getElementById(`thr-pct-${i}`);
      if (pctEl) pctEl.textContent = Math.round(Math.abs(v) * 100) + '%';
    });

    // Update vehicle diagram thruster glow
    updateVehicleDiagram(thrVals);

    // ── Power ──
    const totalThr = thrVals.reduce((acc, v) => acc + Math.abs(v), 0) / thrVals.length;
    const maxPwr   = rovCfg.power;
    const curPwr   = Math.round(totalThr * maxPwr * (state.lightsOn ? 1.12 : 1.0));
    const pct      = Math.min(100, (curPwr / maxPwr) * 100);
    document.getElementById('pwr-bar').style.width = pct + '%';
    document.getElementById('pwr-val').textContent = curPwr > 999
      ? (curPwr / 1000).toFixed(1) + ' kW'
      : curPwr + ' W';

    // ── Tether tension ──
    const tetherDist = phy.pos.distanceTo(LARS_POS);
    const maxTether  = rovCfg.tetherMax;
    const tension    = Math.max(0, (tetherDist / maxTether) * 100);
    document.getElementById('tns-bar').style.width = Math.min(100, tension).toFixed(1) + '%';
    document.getElementById('tns-val').textContent = Math.round(tetherDist * 9.8) + ' N';
    const tdEl = document.getElementById('tether-dist');
    if (tdEl) tdEl.textContent = tetherDist.toFixed(1) + ' m';

    // ── Status pill ──
    const statusEl = document.getElementById('hud-status');
    if (statusEl) {
      if (tension > 85) {
        statusEl.textContent = '⚠ TETHER LIMIT';
        statusEl.className = 'hh-status-pill danger';
      } else if (!state.lightsOn && ENV_CONFIGS[state.selectedEnv]?.sunInt < 0.1) {
        statusEl.textContent = '⚠ LIGHTS REQUIRED';
        statusEl.className = 'hh-status-pill warn';
      } else {
        statusEl.textContent = 'NOMINAL';
        statusEl.className = 'hh-status-pill';
      }
    }

    // ── Mission progress ──
    checkMissionProximity();
  }

  /* ═══════════════════════════════════════════════════════════
     MISSIONS
     ═══════════════════════════════════════════════════════════ */

  function initMission() {
    const envCfg  = ENV_CONFIGS[state.selectedEnv];
    const listEl  = document.getElementById('mission-list');
    const noneEl  = document.getElementById('mission-none');

    if (!envCfg.mission) {
      if (listEl) listEl.style.display = 'none';
      if (noneEl) noneEl.style.display = 'block';
      return;
    }

    if (listEl) listEl.style.display = '';
    if (noneEl) noneEl.style.display = 'none';

    missionDef   = MISSIONS[envCfg.mission];
    missionState = {};
    missionDef.objectives.forEach(o => { missionState[o.id] = false; });
    renderMissionList();
  }

  function renderMissionList() {
    const list = document.getElementById('mission-list');
    list.innerHTML = '';
    missionDef.objectives.forEach(o => {
      const done = missionState[o.id];
      list.innerHTML += `
        <div class="mission-obj ${done ? 'done' : ''}" id="obj-${o.id}">
          <div class="obj-dot ${done ? 'done' : ''}"></div>
          <span>${o.text}</span>
        </div>`;
    });
  }

  function completeObjective(id) {
    if (missionState[id]) return;
    missionState[id] = true;
    renderMissionList();
    const obj = missionDef?.objectives.find(o => o.id === id);
    if (obj) showAlert('✓ ' + obj.text.toUpperCase(), 'alert-success');

    // Check if all done
    const allDone = Object.values(missionState).every(Boolean);
    if (allDone) {
      setTimeout(() => showAlert('MISSION COMPLETE — ALL OBJECTIVES ACHIEVED', 'alert-success'), 600);
    }
  }

  function checkMissionProximity() {
    if (!missionDef || !envExtras) return;

    const p = phy.pos;
    const envId = state.selectedEnv;

    if (envId === 'shallow-pipeline' || envId === 'free-dive') {
      const pipeZ = 0;
      const distToPipe = Math.abs(p.x);
      if (distToPipe < 5 && Math.abs(p.z - pipeZ) < 65) completeObjective('approach');
      if (distToPipe < 4 && p.z < 0)  completeObjective('survey-a');
      if (distToPipe < 4 && p.z > 0)  completeObjective('survey-b');
      if (distToPipe < 3 && Math.abs(p.z + 22) < 3) completeObjective('anomaly');
      if (p.distanceTo(LARS_POS) < 8) completeObjective('return');

    } else if (envId === 'deepwater-wellhead') {
      const whPos = new THREE.Vector3(0, -60, 0);
      const d = p.distanceTo(whPos);
      if (d < 20) completeObjective('locate');
      if (d < 5)  completeObjective('approach');
      if (d < 3 && p.x < 0)  completeObjective('valve1');
      if (d < 3 && p.x >= 0) completeObjective('valve2');
      if (missionState['valve1'] && missionState['valve2']) completeObjective('confirm');

    } else if (envId === 'platform-jacket') {
      const jacketBase = new THREE.Vector3(15, 0, 5);
      if (p.distanceTo(new THREE.Vector3(jacketBase.x - 6, p.y, jacketBase.z - 6)) < 5) completeObjective('node-a');
      if (p.distanceTo(new THREE.Vector3(jacketBase.x + 6, p.y, jacketBase.z - 6)) < 5) completeObjective('node-b');
      if (p.distanceTo(new THREE.Vector3(jacketBase.x + 6, -35, jacketBase.z)) < 4) completeObjective('anode');
      if (p.distanceTo(new THREE.Vector3(jacketBase.x - 6, -42, jacketBase.z + 6)) < 4) completeObjective('crack');
      if (p.y > -5) completeObjective('return');
    }
  }

  /* ═══════════════════════════════════════════════════════════
     ALERTS
     ═══════════════════════════════════════════════════════════ */

  function showAlert(msg, cls = 'alert-info') {
    const stack = document.getElementById('alert-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `alert-msg ${cls}`;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  /* ═══════════════════════════════════════════════════════════
     PAUSE / RESUME / MENU
     ═══════════════════════════════════════════════════════════ */

  function togglePause() {
    state.paused = !state.paused;
    document.getElementById('pause-menu').classList.toggle('hidden', !state.paused);
    if (!state.paused) {
      state.startTime = performance.now() - state.elapsed * 1000;
      animate();
    }
  }

  function resume() {
    if (state.paused) togglePause();
  }

  function returnToMenu() {
    state.running = false;
    state.paused  = false;

    // Remove Three.js resources
    if (renderer) { renderer.dispose(); renderer = null; }
    if (scene) { scene.clear(); scene = null; }
    rovGroup = null;
    tetherLine = null;

    // Clear input
    for (const k in keys) delete keys[k];

    // Reset gamepad analog state (keep connection — it persists across sessions)
    gp.axes     = [0, 0, 0, 0];
    gp.buttons  = [];
    gp.prevBtns = [];

    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('simulator-screen').classList.add('hidden');
    document.getElementById('selection-screen').classList.remove('hidden');

    // Reset selection
    state.selectedROV = null;
    state.selectedEnv = null;
    state.lightsOn    = false;
    state.camera      = 0;
    document.querySelectorAll('.rov-card, .env-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('launch-btn').disabled = true;
    document.getElementById('sel-summary').textContent = 'Select an ROV and environment to begin';
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN LOOP
     ═══════════════════════════════════════════════════════════ */

  let lastT = performance.now();

  function animate() {
    if (!state.running || state.paused) return;
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt  = Math.min((now - lastT) / 1000, 0.05);  // cap at 50 ms
    lastT = now;

    const t = now / 1000;

    pollGamepad();
    updatePhysics(dt);
    updateCamera();
    updateHUD(dt);
    Environment.update(envExtras, t);

    renderer.render(scene, camera);
  }

  /* ═══════════════════════════════════════════════════════════
     STARTUP
     ═══════════════════════════════════════════════════════════ */

  function init() {
    initSelectionScreen();
    showWelcomeHint();
  }

  function showWelcomeHint() {
    // Auto-select first env for convenience
    // (leave blank so user must choose)
  }

  /* ── Public API (for inline onclick handlers) ─────────────── */
  return { init, resume, returnToMenu, togglePause, showAlert };

})();

/* ── Boot ───────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => SimApp.init());
