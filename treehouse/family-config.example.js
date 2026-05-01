/* ─────────────────────────────────────────────────────────────
   family-config.example.js — TEMPLATE (safe to commit)

   Copy this file to family-config.js and fill in your details.
   family-config.js is gitignored and never committed.
   ───────────────────────────────────────────────────────────── */

const FAMILY_CONFIG = {

  /* Family identity */
  family_id:   'your-family-id-001',
  family_name: 'The Smith Family',
  timezone:    'Australia/Brisbane',
  locale:      'en-AU',

  /* Admin PIN (4 digits) */
  admin_pin: '1234',

  /* Screensaver idle timeout in seconds */
  idle_timeout_secs: 120,

  /* ── Family members ──────────────────────────────────────
     Roles: 'admin' | 'child'
     Age groups: 'adult' | 'teen' | 'child' | 'junior'
     icon_mode: true for youngest children who prefer emoji steps
     colour_hex: each member gets a unique colour
     ─────────────────────────────────────────────────────── */
  members: [
    {
      id:           'member-parent1',
      display_name: 'Parent 1',
      role:         'admin',
      age_group:    'adult',
      colour_hex:   '#3b82f6',
      icon:         '👨',
      icon_mode:    false,
    },
    {
      id:           'member-parent2',
      display_name: 'Parent 2',
      role:         'admin',
      age_group:    'adult',
      colour_hex:   '#f43f5e',
      icon:         '👩',
      icon_mode:    false,
    },
    {
      id:           'member-child1',
      display_name: 'Child 1',
      role:         'child',
      age_group:    'teen',
      colour_hex:   '#22c55e',
      icon:         '🧑',
      icon_mode:    false,
    },
    {
      id:           'member-child2',
      display_name: 'Child 2',
      role:         'child',
      age_group:    'child',
      colour_hex:   '#f97316',
      icon:         '🧒',
      icon_mode:    false,
    },
    {
      id:           'member-child3',
      display_name: 'Child 3',
      role:         'child',
      age_group:    'junior',
      colour_hex:   '#eab308',
      icon:         '👶',
      icon_mode:    true,
    },
  ],

  /* ── Locations (used in event templates) ─────────────────
     Replace with your real locations.
     ─────────────────────────────────────────────────────── */
  locations: {
    school:     'Primary School',
    gym:        'Local Gym',
    sports:     'Sports Oval',
    pool:       'Aquatic Centre',
    clinic:     'Medical Clinic',
    supermarket:'Supermarket',
  },

};

export default FAMILY_CONFIG;
