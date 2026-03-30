'use strict';

/* =============================================================
   ROV PILOT SIMULATOR — environment.js
   Builds the underwater Three.js scene for each environment.
   ============================================================= */

const Environment = {

  /* main entry point — returns scene extras for updates */
  build(scene, envId) {
    const cfg = ENV_CONFIGS[envId];
    if (!cfg) return {};

    const extras = {};

    // ── Fog ──────────────────────────────────────────────────
    scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);
    scene.background = new THREE.Color(cfg.fogColor);

    // ── Lighting ─────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(cfg.ambientCol, cfg.ambientInt);
    scene.add(ambient);

    if (cfg.sunInt > 0) {
      const sun = new THREE.DirectionalLight(cfg.sunCol, cfg.sunInt);
      sun.position.set(5, 20, 8);
      sun.castShadow = false;
      scene.add(sun);

      // Faint fill from below (caustic bounce)
      const fill = new THREE.DirectionalLight(cfg.sunCol, cfg.sunInt * 0.12);
      fill.position.set(-3, -10, -4);
      scene.add(fill);
    }

    // ── Seabed ───────────────────────────────────────────────
    const seabedMesh = this._buildSeabed(cfg);
    scene.add(seabedMesh);

    // ── Caustic patch lights (animated) ──────────────────────
    const caustics = this._buildCaustics(scene, cfg);
    extras.caustics = caustics;

    // ── Marine snow particles ─────────────────────────────────
    const snow = this._buildMarineSnow(cfg);
    scene.add(snow);
    extras.snow = snow;

    // ── Environment-specific structures ──────────────────────
    if (cfg.hasPipeline) {
      const pipeGroup = this._buildPipeline(cfg);
      scene.add(pipeGroup);
      extras.pipeline = pipeGroup;
    }

    if (cfg.hasWellhead) {
      const wh = this._buildWellhead(cfg);
      scene.add(wh);
      extras.wellhead = wh;
    }

    if (cfg.hasJacket) {
      const jacket = this._buildJacket(cfg);
      scene.add(jacket);
      extras.jacket = jacket;
    }

    // Scatter objects
    this._addScatterObjects(scene, cfg);

    extras.cfg = cfg;
    return extras;
  },

  /* ── Seabed ──────────────────────────────────────────────── */
  _buildSeabed(cfg) {
    const size = 300;
    const segs  = 64;
    const geo   = new THREE.PlaneGeometry(size, size, segs, segs);

    // Height-map the seabed verts for realism
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = (Math.sin(x * 0.08) * Math.cos(z * 0.07) * 1.5)
              + (Math.sin(x * 0.21 + 0.3) * Math.sin(z * 0.19) * 0.7)
              + (Math.random() * 0.3);
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color:     cfg.seabedCol,
      roughness: 0.95,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = cfg.seabedY;
    mesh.receiveShadow = true;
    return mesh;
  },

  /* ── Caustic lights (animated) ───────────────────────────── */
  _buildCaustics(scene, cfg) {
    if (cfg.sunInt < 0.1) return [];  // deep water — no caustics

    const lights = [];
    for (let i = 0; i < 8; i++) {
      const pl = new THREE.PointLight(cfg.sunCol, 0.25, 22);
      pl.position.set(
        (Math.random() - 0.5) * 40,
        cfg.seabedY + 2,
        (Math.random() - 0.5) * 40,
      );
      pl.userData.phase  = Math.random() * Math.PI * 2;
      pl.userData.speed  = 0.4 + Math.random() * 0.6;
      pl.userData.baseY  = pl.position.y;
      pl.userData.baseX  = pl.position.x;
      pl.userData.baseZ  = pl.position.z;
      scene.add(pl);
      lights.push(pl);
    }
    return lights;
  },

  /* ── Marine snow particles ───────────────────────────────── */
  _buildMarineSnow(cfg) {
    const count = 1800;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const spread = 60;
    const depthRange = Math.abs(cfg.seabedY) + 10;

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = cfg.seabedY + Math.random() * depthRange;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size:  0.06,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });

    const pts = new THREE.Points(geo, mat);
    pts.userData.initialPos = pos.slice();  // store original
    return pts;
  },

  /* ── Pipeline ────────────────────────────────────────────── */
  _buildPipeline(cfg) {
    const group = new THREE.Group();

    const pipeMat    = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.45 });
    const flangeMat  = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
    const anodeMat   = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.6, roughness: 0.5 });
    const rustMat    = new THREE.MeshStandardMaterial({ color: 0x663322, metalness: 0.3, roughness: 0.9 });
    const coatMat    = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, metalness: 0.2, roughness: 0.95 });

    const Y = cfg.seabedY + 0.55;  // just above seabed

    // Main pipeline run — 120 m long (in scene Z direction)
    const pipeR  = 0.35;
    const pipeLen = 120;

    // Concrete weight coating (outer)
    const cg = new THREE.CylinderGeometry(pipeR + 0.04, pipeR + 0.04, pipeLen, 24);
    const cm = new THREE.Mesh(cg, coatMat);
    cm.rotation.x = Math.PI / 2;
    cm.position.set(0, Y, 0);
    group.add(cm);

    // Steel pipe inner (visible at joints)
    const pg = new THREE.CylinderGeometry(pipeR, pipeR, pipeLen, 20);
    const pm = new THREE.Mesh(pg, pipeMat);
    pm.rotation.x = Math.PI / 2;
    pm.position.set(0, Y, 0);
    group.add(pm);

    // Flanges every 12 m
    for (let z = -54; z <= 54; z += 12) {
      const fg = new THREE.CylinderGeometry(pipeR + 0.1, pipeR + 0.1, 0.22, 20);
      const fm = new THREE.Mesh(fg, flangeMat);
      fm.rotation.x = Math.PI / 2;
      fm.position.set(0, Y, z);
      group.add(fm);

      // Bolts around flange
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
        const bg = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6);
        const bm = new THREE.Mesh(bg, flangeMat);
        bm.rotation.x = Math.PI / 2;
        bm.position.set(
          Math.cos(angle) * (pipeR + 0.07),
          Y + Math.sin(angle) * (pipeR + 0.07),
          z
        );
        group.add(bm);
      }
    }

    // Sacrificial anodes (every 20 m)
    for (let z = -40; z <= 40; z += 20) {
      const ag = new THREE.BoxGeometry(0.12, 0.26, 0.45);
      const am = new THREE.Mesh(ag, anodeMat);
      am.position.set(pipeR + 0.08, Y, z);
      group.add(am);
    }

    // Corrosion anomaly (mission objective highlight)
    const rustG = new THREE.CylinderGeometry(pipeR + 0.045, pipeR + 0.04, 0.9, 16);
    const rustM = new THREE.Mesh(rustG, rustMat);
    rustM.rotation.x = Math.PI / 2;
    rustM.position.set(0, Y, -22);
    group.add(rustM);

    // Pipeline supports / spans
    [-48, -24, 24, 48].forEach(z => {
      const sg = new THREE.BoxGeometry(0.18, 0.4, 0.18);
      const sm = new THREE.Mesh(sg, flangeMat);
      sm.position.set(0, Y - 0.45, z);
      group.add(sm);
    });

    // Weld lines
    for (let z = -54; z <= 54; z += 6) {
      const wg = new THREE.TorusGeometry(pipeR + 0.005, 0.008, 8, 24);
      const wm = new THREE.Mesh(wg, pipeMat);
      wm.rotation.x = Math.PI / 2;
      wm.position.set(0, Y, z);
      group.add(wm);
    }

    // Offset from centre
    group.position.set(0, 0, 0);
    return group;
  },

  /* ── Wellhead / Christmas Tree ───────────────────────────── */
  _buildWellhead(cfg) {
    const group  = new THREE.Group();
    const Y      = cfg.seabedY;
    const steel  = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.75, roughness: 0.4 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xddbb00, metalness: 0.5, roughness: 0.5 });
    const red    = new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.4, roughness: 0.6 });
    const handle = new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.5, roughness: 0.5 });
    const black  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });

    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); group.add(m);
    };

    // Conductor casing base
    add(new THREE.CylinderGeometry(0.5, 0.6, 2.5, 20), steel, 0, Y + 1.25, 0);
    // Wellhead housing
    add(new THREE.CylinderGeometry(0.55, 0.55, 1.0, 20), steel, 0, Y + 3.0, 0);
    // Tubing hanger
    add(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 16), steel, 0, Y + 3.75, 0);

    // Christmas tree body
    add(new THREE.BoxGeometry(0.9, 1.4, 0.9), steel, 0, Y + 5.0, 0);
    // Upper tree cap
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 12), steel, 0, Y + 5.95, 0);

    // Valve 1 (horizontal, port side)
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12), steel, -0.65, Y + 4.8, 0, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12), yellow, -0.9, Y + 4.8, 0, 0, 0, Math.PI / 2);
    // Valve 1 handwheel
    add(new THREE.TorusGeometry(0.14, 0.015, 6, 16), handle, -1.02, Y + 4.8, 0, 0, Math.PI / 2, 0);
    // Valve 1 stem
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), steel, -1.02, Y + 4.96, 0);

    // Valve 2 (starboard side)
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12), steel, 0.65, Y + 5.2, 0, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12), red, 0.9, Y + 5.2, 0, 0, 0, Math.PI / 2);
    add(new THREE.TorusGeometry(0.14, 0.015, 6, 16), handle, 1.02, Y + 5.2, 0, 0, Math.PI / 2, 0);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), steel, 1.02, Y + 5.36, 0);

    // Choke manifold
    add(new THREE.BoxGeometry(1.8, 0.5, 0.6), steel, 0, Y + 4.4, -0.8);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10), steel, -0.5, Y + 4.4, -0.75, Math.PI / 2, 0, 0);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10), steel,  0.5, Y + 4.4, -0.75, Math.PI / 2, 0, 0);

    // Intervention panel
    add(new THREE.BoxGeometry(0.85, 0.6, 0.08), black, 0, Y + 4.6, 0.48);

    // Guide posts
    [-0.55, 0.55].forEach(x => {
      add(new THREE.CylinderGeometry(0.04, 0.04, 4.5, 10), steel, x, Y + 2.25, -0.55);
      add(new THREE.SphereGeometry(0.06, 8, 6), yellow, x, Y + 4.5, -0.55);
    });

    // Mud mat
    add(new THREE.BoxGeometry(3.5, 0.08, 3.5), new THREE.MeshStandardMaterial({ color: 0x1a1a12, roughness: 0.98 }), 0, Y, 0);

    // Wellhead structural anchor points
    [-0.9, 0.9].forEach(x => {
      add(new THREE.BoxGeometry(0.14, 0.5, 0.14), steel, x, Y + 0.25, 0);
    });

    return group;
  },

  /* ── Platform jacket legs (simplified) ──────────────────── */
  _buildJacket(cfg) {
    const group  = new THREE.Group();
    const seabedY = cfg.seabedY;
    const topY    = 8;  // above water surface in scene

    const steel    = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.7, roughness: 0.5 });
    const corroded = new THREE.MeshStandardMaterial({ color: 0x664422, metalness: 0.3, roughness: 0.9 });
    const biofoul  = new THREE.MeshStandardMaterial({ color: 0x334433, metalness: 0.0, roughness: 1.0 });
    const anode    = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.6, roughness: 0.5 });

    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); group.add(m);
    };

    const height = topY - seabedY;
    const legSpread = 12;

    // Four main legs
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
      const x = sx * legSpread * 0.5;
      const z = sz * legSpread * 0.5;

      // Main leg tube
      add(new THREE.CylinderGeometry(0.35, 0.45, height, 16), steel, x, seabedY + height * 0.5, z);

      // Biofouling patch (upper section)
      add(new THREE.CylinderGeometry(0.37, 0.37, height * 0.3, 16), biofoul, x, seabedY + height * 0.82, z);

      // Sacrificial anodes
      [-0.3, 0, 0.3].forEach(dy => {
        add(new THREE.BoxGeometry(0.12, 0.3, 0.5), anode, x + 0.42, seabedY + height * 0.3 + dy * 4, z);
      });
    });

    // Horizontal brace levels
    [0.15, 0.35, 0.55, 0.75].forEach(frac => {
      const y = seabedY + height * frac;

      // Cross braces (X pattern on each face)
      [
        [[-6, y, -6], [6, y, -6]],   // front
        [[6, y, -6],  [6, y,  6]],   // right
        [[6, y,  6],  [-6, y, 6]],   // back
        [[-6, y,  6], [-6, y, -6]],  // left
      ].forEach(([a, b]) => {
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
        const cx  = (a[0] + b[0]) * 0.5;
        const cz  = (a[2] + b[2]) * 0.5;
        const angle = Math.atan2(b[0] - a[0], b[2] - a[2]);
        const bg = new THREE.CylinderGeometry(0.12, 0.12, len, 12);
        const bm = new THREE.Mesh(bg, steel);
        bm.position.set(cx, y, cz);
        bm.rotation.set(0, angle, Math.PI / 2);
        group.add(bm);
      });

      // Diagonal X-braces on each face
      if (frac > 0.2) {
        const yPrev = seabedY + height * (frac - 0.2);
        [
          [[-6, yPrev, -6], [6, y, -6]],
          [[6, yPrev, -6],  [-6, y, -6]],
        ].forEach(([a, b]) => {
          const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
          const cx  = (a[0] + b[0]) * 0.5;
          const cy  = (a[1] + b[1]) * 0.5;
          const cz  = (a[2] + b[2]) * 0.5;
          const dg = new THREE.CylinderGeometry(0.08, 0.08, len, 10);
          const dm = new THREE.Mesh(dg, steel);
          dm.position.set(cx, cy, cz);
          dm.rotation.z = Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2]));
          dm.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
          group.add(dm);
        });
      }
    });

    // Corrosion indications
    const crackPositions = [
      [-5.8, seabedY + height * 0.38, -5.8],
      [5.8,  seabedY + height * 0.55,  5.8],
    ];
    crackPositions.forEach(([x, y, z]) => {
      add(new THREE.BoxGeometry(0.5, 0.6, 0.08), corroded, x, y, z);
    });

    // Jacket offset to the side so ROV spawn point is clear
    group.position.set(15, 0, 5);
    return group;
  },

  /* ── Scatter decorative objects ──────────────────────────── */
  _addScatterObjects(scene, cfg) {
    const Y      = cfg.seabedY;
    const rocky  = new THREE.MeshStandardMaterial({ color: 0x445544, roughness: 0.95, metalness: 0.0 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.98, metalness: 0.0 });

    const rng = (min, max) => min + Math.random() * (max - min);

    // Rock formations
    for (let i = 0; i < 30; i++) {
      const r  = rng(0.3, 1.6);
      const geo = new THREE.DodecahedronGeometry(r, 0);
      const m   = new THREE.Mesh(geo, rocky);
      m.position.set(rng(-60, 60), Y + r * 0.4, rng(-60, 60));
      m.rotation.set(rng(0, Math.PI), rng(0, Math.PI), rng(0, Math.PI));
      m.scale.set(rng(0.7, 1.4), rng(0.4, 0.9), rng(0.7, 1.3));
      m.castShadow = true;
      scene.add(m);
    }

    // Sand ripple patches
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.PlaneGeometry(rng(3, 8), rng(3, 8), 6, 6);
      const m   = new THREE.Mesh(geo, sandMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(rng(-50, 50), Y + 0.02, rng(-50, 50));
      scene.add(m);
    }

    // Debris pieces (generic metal tube/box)
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.6, roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const geo = Math.random() > 0.5
        ? new THREE.CylinderGeometry(0.06, 0.06, rng(0.5, 2.0), 8)
        : new THREE.BoxGeometry(rng(0.3, 0.8), rng(0.15, 0.4), rng(0.3, 1.0));
      const m = new THREE.Mesh(geo, debrisMat);
      m.position.set(rng(-40, 40), Y + 0.1, rng(-40, 40));
      m.rotation.set(rng(-0.3, 0.3), rng(0, Math.PI), rng(-0.3, 0.3));
      scene.add(m);
    }
  },

  /* ── Per-frame update ────────────────────────────────────── */
  update(extras, t) {
    // Animate caustic lights
    if (extras.caustics) {
      extras.caustics.forEach(pl => {
        const p = pl.userData;
        pl.position.x = p.baseX + Math.sin(t * p.speed + p.phase) * 2.0;
        pl.position.z = p.baseZ + Math.cos(t * p.speed * 0.7 + p.phase) * 1.5;
        pl.intensity  = 0.18 + Math.sin(t * p.speed * 1.3 + p.phase) * 0.1;
      });
    }

    // Animate marine snow (drifting down + gentle lateral drift)
    if (extras.snow) {
      const pos  = extras.snow.geometry.attributes.position;
      const init = extras.snow.userData.initialPos;
      const cfg  = extras.cfg;
      const depthRange = Math.abs(cfg.seabedY) + 10;

      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - 0.012;        // drift down
        if (y < cfg.seabedY) y = cfg.seabedY + depthRange;  // reset to top
        pos.setY(i, y);

        // lateral drift
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i * 0.1) * 0.003);
      }
      pos.needsUpdate = true;
    }
  },
};
