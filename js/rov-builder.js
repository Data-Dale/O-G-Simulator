'use strict';

/* =============================================================
   ROV PILOT SIMULATOR — rov-builder.js
   Builds Three.js 3D models for each ROV using procedural geometry.
   All models built at unit scale; main.js scales them.
   ============================================================= */

const ROVBuilder = {

  /* ── Public API ───────────────────────────────────────────── */

  build(rovId) {
    switch (rovId) {
      case 'videoray-pro4':   return this._buildVideoRay();
      case 'schilling-uhd':   return this._buildSchillingUHD();
      case 'seaeye-falcon':   return this._buildSeaeyeFalcon();
      case 'millennium-plus': return this._buildMillenniumPlus();
      default:                return this._buildVideoRay();
    }
  },

  /* ── Shared material helpers ──────────────────────────────── */

  _mat(color, metalness = 0.4, roughness = 0.65, emissive = 0) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive });
  },

  _matFlat(color, opacity = 1) {
    const m = new THREE.MeshLambertMaterial({ color });
    if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
    return m;
  },

  _cylinder(rT, rB, h, segs = 12) {
    return new THREE.CylinderGeometry(rT, rB, h, segs);
  },

  _box(w, h, d) { return new THREE.BoxGeometry(w, h, d); },
  _sphere(r, w = 16, h = 12) { return new THREE.SphereGeometry(r, w, h); },

  /* helper: add a mesh to a group, returns mesh */
  _add(group, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  },

  /* ── ROV LIGHTS (attached to model group) ─────────────────── */
  _addROVLights(group, color = 0xffe0a0, count = 2, spreadX = 0.18, fwdZ = -0.5) {
    const lights = [];
    const positions = count === 2
      ? [[-spreadX, 0, fwdZ], [spreadX, 0, fwdZ]]
      : [[-spreadX, 0.04, fwdZ], [spreadX, 0.04, fwdZ], [0, -0.06, fwdZ]];

    positions.slice(0, count).forEach(([x, y, z]) => {
      const pl = new THREE.PointLight(color, 0, 8);  // starts off
      pl.position.set(x, y, z);
      group.add(pl);
      lights.push(pl);

      // small lens mesh
      const lens = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffe8aa, emissive: 0xfff0aa, emissiveIntensity: 0 })
      );
      lens.position.set(x, y, z);
      group.add(lens);
      pl.userData.lens = lens;
    });

    group.userData.lights = lights;
    return lights;
  },

  /* ── ROV: VideoRay Pro 4 ──────────────────────────────────── */
  _buildVideoRay() {
    const g   = new THREE.Group();
    const cfg = ROV_CONFIGS['videoray-pro4'];
    const c   = cfg.bodyColor;     // 0x1a5fa8 — blue
    const ca  = cfg.accentColor;   // 0xffffff

    // Main torpedo body (cylinder along Z)
    this._add(g,
      this._cylinder(0.12, 0.12, 0.85, 16),
      this._mat(c, 0.3, 0.7),
      0, 0, 0,  Math.PI / 2, 0, 0
    );

    // Nose cone
    this._add(g,
      this._cylinder(0, 0.12, 0.22, 16),
      this._mat(ca, 0.1, 0.8),
      0, 0, -0.535,  Math.PI / 2, 0, 0
    );

    // Rear cone
    this._add(g,
      this._cylinder(0.12, 0.05, 0.18, 12),
      this._mat(c, 0.3, 0.7),
      0, 0, 0.515,  Math.PI / 2, 0, 0
    );

    // Camera dome (front)
    this._add(g,
      this._sphere(0.1, 16, 12),
      this._mat(0xaaddff, 0.05, 0.3),
      0, 0, -0.54
    );
    // Lens
    this._add(g,
      this._sphere(0.045, 10, 8),
      this._mat(0x112244, 0.8, 0.2),
      0, 0, -0.63
    );

    // Horizontal thrusters (port & starboard)
    [-0.18, 0.18].forEach(x => {
      // shroud ring
      this._add(g,
        this._cylinder(0.07, 0.07, 0.06, 14),
        this._mat(0x0d3a6e, 0.5, 0.6),
        x, 0, 0.25,  0, 0, Math.PI / 2
      );
      // prop blade hint
      this._add(g,
        this._cylinder(0.055, 0.055, 0.03, 6),
        this._mat(0x336699, 0.7, 0.4),
        x, 0, 0.25,  0, 0, Math.PI / 2
      );
    });

    // Vertical thruster (top)
    this._add(g,
      this._cylinder(0.07, 0.07, 0.06, 14),
      this._mat(0x0d3a6e, 0.5, 0.6),
      0, 0.18, 0.0
    );
    this._add(g,
      this._cylinder(0.055, 0.055, 0.03, 6),
      this._mat(0x336699, 0.7, 0.4),
      0, 0.18, 0.0
    );

    // Skid bumpers
    [-0.12, 0.12].forEach(x => {
      this._add(g,
        this._cylinder(0.015, 0.015, 0.6, 6),
        this._mat(0xdd2200, 0.1, 0.9),
        x, -0.14, 0,  Math.PI / 2, 0, 0
      );
    });

    // Serial number label (box strip)
    this._add(g,
      this._box(0.1, 0.04, 0.18),
      this._mat(ca, 0.0, 0.9),
      0, 0.13, 0.1
    );

    // Tether connector (rear)
    this._add(g,
      this._cylinder(0.03, 0.04, 0.08, 8),
      this._mat(0x888888, 0.7, 0.4),
      0, 0, 0.66,  Math.PI / 2, 0, 0
    );

    this._addROVLights(g, 0xfff0cc, 2, 0.09, -0.56);
    g.userData.rovId = 'videoray-pro4';
    return g;
  },

  /* ── ROV: Schilling UHD ───────────────────────────────────── */
  _buildSchillingUHD() {
    const g   = new THREE.Group();
    const cfg = ROV_CONFIGS['schilling-uhd'];
    const c   = cfg.bodyColor;    // 0xff6600 orange
    const ca  = cfg.accentColor;  // 0xffcc00 yellow

    const frameMat  = this._mat(c,    0.6, 0.5);
    const tubeMat   = this._mat(c,    0.7, 0.45);
    const foamMat   = this._mat(0xe8e0d0, 0.0, 0.95);
    const steelMat  = this._mat(0x444444, 0.8, 0.4);
    const yellowMat = this._mat(ca,   0.3, 0.7);
    const blackMat  = this._mat(0x111111, 0.9, 0.3);
    const glassMat  = new THREE.MeshStandardMaterial({ color: 0x224466, transparent: true, opacity: 0.55, metalness: 0.1, roughness: 0.1 });

    // ── Main frame rails ──
    // Four longitudinal rails (Z direction)
    const railPositions = [[-0.52, 0.28], [0.52, 0.28], [-0.52, -0.3], [0.52, -0.3]];
    railPositions.forEach(([x, y]) => {
      this._add(g, this._cylinder(0.025, 0.025, 2.2, 8), tubeMat, x, y, 0, Math.PI / 2, 0, 0);
    });

    // Front and rear cross members (top & bottom)
    [-0.95, 0.95].forEach(z => {
      // Top cross
      this._add(g, this._cylinder(0.025, 0.025, 1.1, 8), tubeMat, 0,  0.28, z, 0, 0, Math.PI / 2);
      // Bottom cross
      this._add(g, this._cylinder(0.025, 0.025, 1.1, 8), tubeMat, 0, -0.3,  z, 0, 0, Math.PI / 2);
      // Verticals
      [-0.52, 0.52].forEach(x => {
        this._add(g, this._cylinder(0.022, 0.022, 0.6, 8), tubeMat, x, 0, z);
      });
    });

    // Mid cross members
    [-0.4, 0.4].forEach(z => {
      this._add(g, this._cylinder(0.02, 0.02, 1.1, 8), tubeMat, 0, 0.28, z, 0, 0, Math.PI / 2);
      this._add(g, this._cylinder(0.02, 0.02, 1.1, 8), tubeMat, 0, -0.3,  z, 0, 0, Math.PI / 2);
    });

    // ── Syntactic foam buoyancy blocks (top) ──
    [[-0.26, 0.36, -0.45], [0.26, 0.36, -0.45],
     [-0.26, 0.36,  0.0 ], [0.26, 0.36,  0.0 ],
     [-0.26, 0.36,  0.45], [0.26, 0.36,  0.45]].forEach(([x, y, z]) => {
      this._add(g, this._box(0.48, 0.12, 0.42), foamMat, x, y, z);
    });

    // ── Electronics housings ──
    [-0.26, 0.26].forEach(x => {
      this._add(g, this._cylinder(0.14, 0.14, 1.4, 16), this._mat(0x223344, 0.5, 0.6), x, 0.0, 0, Math.PI / 2, 0, 0);
      // End caps
      [-0.72, 0.72].forEach(z => {
        this._add(g, this._cylinder(0.14, 0.14, 0.04, 16), steelMat, x, 0.0, z, Math.PI / 2, 0, 0);
      });
    });

    // ── Camera cluster (front) ──
    // Housing
    this._add(g, this._box(0.2, 0.18, 0.15), blackMat, 0, 0.04, -1.0);
    // Main camera
    const camGeo = this._cylinder(0.055, 0.055, 0.12, 14);
    this._add(g, camGeo, blackMat, 0, 0.04, -1.12, Math.PI / 2, 0, 0);
    this._add(g, this._sphere(0.055, 12, 10), glassMat, 0, 0.04, -1.18);
    // Pan/tilt head
    this._add(g, this._cylinder(0.045, 0.045, 0.08, 12), steelMat, 0, 0.04, -1.08, Math.PI / 2, 0, 0);

    // ── Horizontal thrusters (4 corners) ──
    [[-0.52, 0, -0.7], [0.52, 0, -0.7], [-0.52, 0, 0.7], [0.52, 0, 0.7]].forEach(([x, y, z]) => {
      // Thruster pod body
      this._add(g, this._cylinder(0.09, 0.09, 0.22, 12), steelMat, x, y, z, Math.PI / 2, 0, 0);
      // Shroud ring
      this._add(g, this._cylinder(0.12, 0.12, 0.05, 14), tubeMat, x, y, z, Math.PI / 2, 0, 0);
      // Prop guard
      this._add(g, new THREE.TorusGeometry(0.1, 0.012, 6, 14), tubeMat, x, y, z, Math.PI / 2, 0, 0);
    });

    // ── Vertical thrusters (4) ──
    [[-0.38, -0.3, -0.6], [0.38, -0.3, -0.6], [-0.38, -0.3, 0.6], [0.38, -0.3, 0.6]].forEach(([x, y, z]) => {
      this._add(g, this._cylinder(0.09, 0.09, 0.22, 12), steelMat, x, y, z);
      this._add(g, new THREE.TorusGeometry(0.1, 0.012, 6, 14), tubeMat, x, y, z);
    });

    // ── Tool skid ──
    this._add(g, this._box(1.0, 0.08, 1.8), steelMat, 0, -0.38, 0);
    this._add(g, this._box(0.96, 0.06, 1.74), this._mat(0x1a1a1a, 0.3, 0.8), 0, -0.34, 0);

    // ── Manipulator arms (dual 7-function) ──
    // Left arm
    this._buildManipArm(g, -0.42, -0.12, -0.9, ca);
    // Right arm
    this._buildManipArm(g,  0.42, -0.12, -0.9, ca);

    // ── Lights ──
    [-0.32, 0.32, 0].forEach(x => {
      const lz = -1.05;
      this._add(g, this._cylinder(0.04, 0.04, 0.08, 8), this._mat(0xffe8aa, 0.1, 0.5), x, 0.12, lz, Math.PI / 2, 0, 0);
    });

    this._addROVLights(g, 0xfff2cc, 2, 0.32, -1.05);
    g.userData.rovId = 'schilling-uhd';
    return g;
  },

  /* ── ROV: Saab Seaeye Falcon ──────────────────────────────── */
  _buildSeaeyeFalcon() {
    const g   = new THREE.Group();
    const cfg = ROV_CONFIGS['seaeye-falcon'];
    const c   = cfg.bodyColor;   // 0xddbb00 yellow
    const ca  = cfg.accentColor; // 0x222222 dark

    const frameMat  = this._mat(c,   0.5, 0.5);
    const darkMat   = this._mat(ca,  0.3, 0.7);
    const steelMat  = this._mat(0x556677, 0.8, 0.4);
    const glassMat  = new THREE.MeshStandardMaterial({ color: 0x3366aa, transparent: true, opacity: 0.5, metalness: 0.1, roughness: 0.1 });

    // ── Frame rails ──
    // Two longitudinal side rails
    [-0.36, 0.36].forEach(x => {
      this._add(g, this._cylinder(0.018, 0.018, 1.5, 8), frameMat, x, 0, 0, Math.PI / 2, 0, 0);
    });

    // Cross members
    [-0.55, -0.1, 0.1, 0.55].forEach(z => {
      this._add(g, this._cylinder(0.016, 0.016, 0.74, 8), frameMat, 0, 0, z, 0, 0, Math.PI / 2);
    });

    // Top rail
    this._add(g, this._cylinder(0.018, 0.018, 1.4, 8), frameMat, 0, 0.24, 0, Math.PI / 2, 0, 0);

    // Bottom skid
    this._add(g, this._box(0.74, 0.04, 1.3), darkMat, 0, -0.22, 0);

    // ── Electronics pod ──
    this._add(g, this._cylinder(0.17, 0.17, 1.05, 16), this._mat(0x2a2a2a, 0.4, 0.6), 0, 0.0, 0.1, Math.PI / 2, 0, 0);
    // End plates
    [-0.58, 0.63].forEach(z => {
      this._add(g, this._cylinder(0.17, 0.17, 0.03, 16), steelMat, 0, 0.0, z, Math.PI / 2, 0, 0);
    });

    // ── Camera (front) ──
    this._add(g, this._cylinder(0.1, 0.1, 0.14, 14), darkMat, 0, 0.04, -0.7, Math.PI / 2, 0, 0);
    this._add(g, this._sphere(0.095, 14, 10), glassMat, 0, 0.04, -0.78);
    // Camera pan mount
    this._add(g, this._box(0.14, 0.1, 0.1), steelMat, 0, 0.04, -0.68);

    // ── Thrusters (6 vectored) ──
    // Horizontal 4-corner
    [[-0.38, 0, -0.52], [0.38, 0, -0.52], [-0.38, 0, 0.52], [0.38, 0, 0.52]].forEach(([x, y, z]) => {
      this._add(g, this._cylinder(0.075, 0.075, 0.18, 12), steelMat, x, y, z, Math.PI / 2, 0, 0);
      this._add(g, new THREE.TorusGeometry(0.082, 0.01, 6, 12), frameMat, x, y, z, Math.PI / 2, 0, 0);
    });

    // Vertical 2
    [-0.24, 0.24].forEach(x => {
      this._add(g, this._cylinder(0.075, 0.075, 0.18, 12), steelMat, x, -0.22, 0.1);
      this._add(g, new THREE.TorusGeometry(0.082, 0.01, 6, 12), frameMat, x, -0.22, 0.1);
    });

    // ── Lights ──
    [-0.12, 0.12].forEach(x => {
      this._add(g, this._cylinder(0.03, 0.03, 0.07, 8), this._mat(0xffe8aa, 0.1, 0.5), x, 0.1, -0.76, Math.PI / 2, 0, 0);
    });

    this._addROVLights(g, 0xfff2cc, 2, 0.12, -0.76);
    g.userData.rovId = 'seaeye-falcon';
    return g;
  },

  /* ── ROV: Oceaneering Millennium+ ────────────────────────── */
  _buildMillenniumPlus() {
    const g   = new THREE.Group();
    const cfg = ROV_CONFIGS['millennium-plus'];
    const c   = cfg.bodyColor;   // 0xee3300 red-orange
    const ca  = cfg.accentColor; // 0xffff00 yellow

    const frameMat  = this._mat(c,    0.6, 0.45);
    const tubeMat   = this._mat(c,    0.65, 0.45);
    const foamMat   = this._mat(0xdcdad0, 0.0, 0.95);
    const steelMat  = this._mat(0x404040, 0.8, 0.4);
    const yellowMat = this._mat(ca,   0.35, 0.65);
    const darkMat   = this._mat(0x111111, 0.7, 0.5);
    const glassMat  = new THREE.MeshStandardMaterial({ color: 0x224466, transparent: true, opacity: 0.5, metalness: 0.1, roughness: 0.1 });

    // ── Main frame ──
    // Longitudinal rails
    [[-0.5, 0.25], [0.5, 0.25], [-0.5, -0.28], [0.5, -0.28]].forEach(([x, y]) => {
      this._add(g, this._cylinder(0.025, 0.025, 2.0, 8), tubeMat, x, y, 0, Math.PI / 2, 0, 0);
    });

    // Cross members
    [-0.85, -0.42, 0, 0.42, 0.85].forEach(z => {
      this._add(g, this._cylinder(0.022, 0.022, 1.06, 8), tubeMat, 0,  0.25, z, 0, 0, Math.PI / 2);
      this._add(g, this._cylinder(0.022, 0.022, 1.06, 8), tubeMat, 0, -0.28, z, 0, 0, Math.PI / 2);
    });

    // Vertical struts
    [-0.8, -0.3, 0.3, 0.8].forEach(z => {
      [-0.5, 0.5].forEach(x => {
        this._add(g, this._cylinder(0.02, 0.02, 0.55, 8), tubeMat, x, 0, z);
      });
    });

    // ── Foam buoyancy (top) ──
    [[-0.24, 0.33, -0.55], [0.24, 0.33, -0.55],
     [-0.24, 0.33,  0.0 ], [0.24, 0.33,  0.0 ],
     [-0.24, 0.33,  0.55], [0.24, 0.33,  0.55]].forEach(([x, y, z]) => {
      this._add(g, this._box(0.44, 0.14, 0.48), foamMat, x, y, z);
    });

    // ── Electronics housings ──
    [-0.25, 0.25].forEach(x => {
      this._add(g, this._cylinder(0.13, 0.13, 1.35, 16), this._mat(0x222233, 0.5, 0.55), x, 0.0, 0, Math.PI / 2, 0, 0);
      [-0.69, 0.69].forEach(z => {
        this._add(g, this._cylinder(0.13, 0.13, 0.04, 16), steelMat, x, 0.0, z, Math.PI / 2, 0, 0);
      });
    });

    // ── Camera cluster ──
    this._add(g, this._box(0.22, 0.2, 0.14), darkMat, 0, 0.05, -0.94);
    this._add(g, this._cylinder(0.06, 0.06, 0.13, 14), darkMat, 0, 0.06, -1.06, Math.PI / 2, 0, 0);
    this._add(g, this._sphere(0.06, 12, 10), glassMat, 0, 0.06, -1.12);
    // wide-angle aux cam
    this._add(g, this._cylinder(0.04, 0.04, 0.08, 10), darkMat, 0.1, 0.08, -1.01, Math.PI / 2, 0, 0);
    this._add(g, this._sphere(0.04, 8, 8), glassMat, 0.1, 0.08, -1.06);

    // ── Corner thrusters (4 horizontal) ──
    [[-0.5, 0, -0.72], [0.5, 0, -0.72], [-0.5, 0, 0.72], [0.5, 0, 0.72]].forEach(([x, y, z]) => {
      this._add(g, this._cylinder(0.09, 0.09, 0.24, 12), steelMat, x, y, z, Math.PI / 2, 0, 0);
      this._add(g, new THREE.TorusGeometry(0.1, 0.012, 6, 14), tubeMat, x, y, z, Math.PI / 2, 0, 0);
    });

    // ── Vertical thrusters (4) ──
    [[-0.36, -0.3, -0.58], [0.36, -0.3, -0.58], [-0.36, -0.3, 0.58], [0.36, -0.3, 0.58]].forEach(([x, y, z]) => {
      this._add(g, this._cylinder(0.09, 0.09, 0.22, 12), steelMat, x, y, z);
      this._add(g, new THREE.TorusGeometry(0.1, 0.012, 6, 14), tubeMat, x, y, z);
    });

    // ── Tool skid ──
    this._add(g, this._box(0.98, 0.07, 1.7), steelMat, 0, -0.37, 0);
    // Work package
    this._add(g, this._box(0.45, 0.2, 0.6), this._mat(0x2a2218, 0.3, 0.8), -0.24, -0.3, 0.3);
    this._add(g, this._box(0.45, 0.2, 0.6), this._mat(0x2a2218, 0.3, 0.8),  0.24, -0.3, 0.3);

    // ── Manipulator arms (dual 7-function) ──
    this.buildManipArm(g, -0.44, -0.1, -0.85, ca);
    this.buildManipArm(g,  0.44, -0.1, -0.85, ca);

    // ── Lights ──
    [-0.3, 0, 0.3].forEach(x => {
      this._add(g, this._cylinder(0.04, 0.04, 0.08, 8), this._mat(0xffe8aa, 0.1, 0.5), x, 0.12, -1.0, Math.PI / 2, 0, 0);
    });

    this._addROVLights(g, 0xfff2cc, 2, 0.3, -1.0);
    g.userData.rovId = 'millennium-plus';
    return g;
  },

  /* ── Manipulator arm helper (shared) ─────────────────────── */
  buildManipArm(group, x, y, z, color = 0xffcc00) {
    const mat = this._mat(color, 0.5, 0.5);
    const dark = this._mat(0x333333, 0.8, 0.4);
    // Shoulder
    this._add(group, this._cylinder(0.045, 0.045, 0.12, 10), dark, x, y, z);
    // Upper arm
    this._add(group, this._cylinder(0.03, 0.03, 0.32, 8), mat, x - (x < 0 ? 0.08 : -0.08), y - 0.14, z - 0.08, 0.4, 0, 0.3 * Math.sign(x));
    // Forearm
    this._add(group, this._cylinder(0.025, 0.025, 0.28, 8), mat, x - (x < 0 ? 0.14 : -0.14), y - 0.28, z - 0.12, 0.6, 0, 0.4 * Math.sign(x));
    // Wrist
    this._add(group, this._sphere(0.04, 8, 6), dark, x - (x < 0 ? 0.2 : -0.2), y - 0.38, z - 0.18);
    // Jaws (open)
    [-0.015, 0.015].forEach(dy => {
      this._add(group, this._box(0.02, 0.04, 0.1), mat, x - (x < 0 ? 0.22 : -0.22), y - 0.38 + dy * 3, z - 0.26);
    });
  },

  _buildManipArm(...args) { return this.buildManipArm(...args); },
};
