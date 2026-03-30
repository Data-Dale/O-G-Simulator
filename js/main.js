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

  /* ── Mission state ─────────────────────────────────────────── */
  let missionDef   = null;
  let missionState = {};  // id -> bool

  /* ── Tether ────────────────────────────────────────────────── */
  let tetherLine = null;
  const LARS_POS = new THREE.Vector3(0, 0, 0);  // LARS position (set on launch)

  /* ── Thruster input axes ────────────────────────────────────── */
  // surge (+fwd), sway (+stbd), heave (+up), yaw (+cw), pitch (+nose down), roll (+stbd down)
  function getAxes() {
    const surge  = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const sway   = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    const heave  = (keys['KeyR'] ? 1 : 0) - (keys['KeyF'] ? 1 : 0);
    const yaw    = (keys['KeyE'] ? 1 : 0) - (keys['KeyQ'] ? 1 : 0);
    const pitch  = (keys['KeyG'] ? 1 : 0) - (keys['KeyT'] ? 1 : 0);
    const roll   = (keys['KeyX'] ? 1 : 0) - (keys['KeyZ'] ? 1 : 0);
    return { surge, sway, heave, yaw, pitch, roll };
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

      if (e.code === 'KeyL') toggleLights();
      if (e.code === 'KeyC') cycleCam();
      if (e.code === 'KeyM') toggleManip();
      if (e.code === 'Escape') togglePause();
    });

    window.addEventListener('keyup', e => { keys[e.code] = false; });
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
    const rovCfg = ROV_CONFIGS[state.selectedROV];
    const maxCam = rovCfg.hasManip ? 2 : 2;
    state.camera = (state.camera + 1) % (maxCam + 1);
    const names = ['CAM 1 · PILOT', 'CAM 2 · CHASE', 'CAM 3 · OVERHEAD'];
    const lbl = document.getElementById('hud-cam-label');
    if (lbl) lbl.textContent = names[state.camera] || 'CAM';
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

  function initHUD() {
    const rovCfg = ROV_CONFIGS[state.selectedROV];

    // ROV name
    document.getElementById('hud-rov-id').textContent =
      rovCfg.name.toUpperCase() + '  ·  ' + rovCfg.manufacturer.toUpperCase();

    // Build thruster bars
    const labels = THRUSTER_LAYOUTS[state.selectedROV] || [];
    const container = document.getElementById('thruster-display');
    container.innerHTML = '';
    labels.forEach((lbl, i) => {
      container.innerHTML += `
        <div class="thr-row">
          <span class="thr-lbl">${lbl}</span>
          <div class="thr-track" id="thr-${i}">
            <div class="thr-center"></div>
            <div class="thr-fill" id="thr-fill-${i}"></div>
          </div>
        </div>`;
    });

    // Depth scale marks (5 ticks)
    const scaleTrack = document.getElementById('depth-fill');
    if (scaleTrack) scaleTrack.style.height = '0%';
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
    });

    // ── Power ──
    const totalThr = thrVals.reduce((acc, v) => acc + Math.abs(v), 0) / thrVals.length;
    const maxPwr   = rovCfg.power > 9999 ? rovCfg.power : rovCfg.power;
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

    // ── HUD status colour ──
    const statusEl = document.getElementById('hud-status');
    if (tension > 85) {
      statusEl.textContent = '⚠ TETHER LIMIT';
      statusEl.style.color = '#ff4444';
    } else if (!state.lightsOn && ENV_CONFIGS[state.selectedEnv]?.sunInt < 0.1) {
      statusEl.textContent = '⚠ LIGHTS REQUIRED';
      statusEl.style.color = '#ffaa00';
    } else {
      statusEl.textContent = 'SYSTEMS NOMINAL';
      statusEl.style.color = '#00ff88';
    }

    // ── Mission progress ──
    checkMissionProximity();
  }

  /* ═══════════════════════════════════════════════════════════
     MISSIONS
     ═══════════════════════════════════════════════════════════ */

  function initMission() {
    const envCfg = ENV_CONFIGS[state.selectedEnv];
    if (!envCfg.mission) {
      document.getElementById('mission-panel').style.display = 'none';
      return;
    }

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
