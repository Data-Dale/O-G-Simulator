/* ─────────────────────────────────────────────
   seed.js — Naughton Family initial data
   All PII loaded from gitignored family-config.js
   ───────────────────────────────────────────── */

import DB from './db.js';
import CONFIG from '../family-config.js';
import { uid, toDateStr, weekStart, addDays } from './utils.js';

const FAMILY_ID = CONFIG.family_id;
const LOC       = CONFIG.locations;

const MEMBERS = CONFIG.members.map(m => ({
  ...m,
  family_id: FAMILY_ID,
  pin_hash: null,
  is_active: true,
}));

/* ── Build date strings relative to today ─── */
const now = new Date();
const mon = weekStart(now);

const dt = (dayOffset, hour = 0, min = 0) => {
  const d = addDays(mon, dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

/* Mon=0 … Sun=6 for the current week */
const buildEvents = () => [
  /* ─ School ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-beth', ext_cal_id: null,
    title: 'School Drop-off', starts_at: dt(0,8,30), ends_at: dt(0,9,0),
    is_all_day: false, location: LOC.school, notes: null,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', source: 'manual',
    countdown_enabled: false, member_ids: ['member-beth','member-lucas','member-jacob','member-bodhi'] },

  { id: uid(), family_id: FAMILY_ID, created_by: 'member-beth', ext_cal_id: null,
    title: 'School Pick-up', starts_at: dt(0,15,15), ends_at: dt(0,15,45),
    is_all_day: false, location: LOC.school, notes: null,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', source: 'manual',
    countdown_enabled: false, member_ids: ['member-beth','member-lucas','member-jacob','member-bodhi'] },

  /* ─ Football ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale', ext_cal_id: null,
    title: 'Lucas — Football Training', starts_at: dt(1,16,0), ends_at: dt(1,17,30),
    is_all_day: false, location: LOC.sports, notes: null,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU,TH', source: 'manual',
    countdown_enabled: false, member_ids: ['member-lucas'] },

  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale', ext_cal_id: null,
    title: 'Lucas — Football Game', starts_at: dt(5,10,0), ends_at: dt(5,12,0),
    is_all_day: false, location: LOC.sports, notes: 'Bring oranges 🍊',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA', source: 'manual',
    countdown_enabled: true, member_ids: ['member-lucas','member-dale'] },

  /* ─ Swimming ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-beth', ext_cal_id: null,
    title: 'Lucas — Swimming', starts_at: dt(2,16,30), ends_at: dt(2,17,30),
    is_all_day: false, location: LOC.pool, notes: null,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=WE', source: 'manual',
    countdown_enabled: false, member_ids: ['member-lucas'] },

  /* ─ Bodhi's Football ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale', ext_cal_id: null,
    title: 'Bodhi — Football Game ⚽', starts_at: dt(5,8,30), ends_at: dt(5,9,30),
    is_all_day: false, location: LOC.sports, notes: "Bodhi's first season!",
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA', source: 'manual',
    countdown_enabled: true, member_ids: ['member-bodhi','member-dale','member-beth'] },

  /* ─ Bodhi's Speech Therapy ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-beth', ext_cal_id: null,
    title: 'Bodhi — Speech Therapy', starts_at: dt(2,14,0), ends_at: dt(2,15,0),
    is_all_day: false, location: LOC.clinic, notes: 'Bring session workbook',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=WE', source: 'manual',
    countdown_enabled: false, member_ids: ['member-bodhi','member-beth'] },

  /* ─ Beth PT ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-beth', ext_cal_id: null,
    title: 'Beth — PT Session 💪', starts_at: dt(0,9,0), ends_at: dt(0,10,0),
    is_all_day: false, location: LOC.gym, notes: null,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', source: 'manual',
    countdown_enabled: false, member_ids: ['member-beth'] },

  /* ─ Dale's Bike Training ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale', ext_cal_id: null,
    title: 'Dale — Ride Training 🚴', starts_at: dt(1,5,30), ends_at: dt(1,7,0),
    is_all_day: false, location: 'River Loop', notes: 'Zone 2 steady state',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU,TH,SA', source: 'manual',
    countdown_enabled: false, member_ids: ['member-dale'] },

  /* ─ Dale's 200km Ride (countdown event) ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale', ext_cal_id: null,
    title: '🎯 200km Ride Challenge', starts_at: '2026-11-01T07:00:00.000Z', ends_at: '2026-11-01T20:00:00.000Z',
    is_all_day: false, location: 'TBC', notes: 'The big one!',
    recurrence_rule: null, source: 'manual',
    countdown_enabled: true, member_ids: ['member-dale'] },

  /* ─ Grocery Shopping ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-beth', ext_cal_id: null,
    title: 'Grocery Shop 🛒', starts_at: dt(5,9,0), ends_at: dt(5,10,30),
    is_all_day: false, location: LOC.supermarket, notes: null,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA', source: 'manual',
    countdown_enabled: false, member_ids: ['member-beth','member-dale'] },

  /* ─ Family Dinner ─ */
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale', ext_cal_id: null,
    title: 'Family Dinner 🍽️', starts_at: dt(0,18,0), ends_at: dt(0,19,0),
    is_all_day: false, location: null, notes: null,
    recurrence_rule: 'FREQ=DAILY', source: 'manual',
    countdown_enabled: false, member_ids: ['member-dale','member-beth','member-lucas','member-jacob','member-bodhi'] },
];

/* ── Task Templates ──────────────────────── */
const TASK_TEMPLATES = [
  /* ─ Dale ─ */
  { id: 'tmpl-dale-dinner',   family_id: FAMILY_ID, assigned_to: 'member-dale',
    title: 'Cook Dinner', icon: '🍳', task_type: 'chore',
    recurrence_rule: 'FREQ=DAILY', due_time: '17:30',
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-dale-lawn',     family_id: FAMILY_ID, assigned_to: 'member-dale',
    title: 'Mow Lawn', icon: '🌿', task_type: 'maintenance',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA', due_time: null,
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-dale-wormfarm', family_id: FAMILY_ID, assigned_to: 'member-dale',
    title: 'Worm Farm Check', icon: '🪱', task_type: 'maintenance',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=WE', due_time: null,
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-dale-veggies',  family_id: FAMILY_ID, assigned_to: 'member-dale',
    title: 'Water Veggie Pods', icon: '🥕', task_type: 'chore',
    recurrence_rule: 'FREQ=DAILY', due_time: '07:00',
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-dale-reading',  family_id: FAMILY_ID, assigned_to: 'member-dale',
    title: 'Evening Reading 📚', icon: '📖', task_type: 'habit',
    recurrence_rule: 'FREQ=DAILY', due_time: '21:00',
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },

  /* ─ Beth ─ */
  { id: 'tmpl-beth-washing',   family_id: FAMILY_ID, assigned_to: 'member-beth',
    title: 'Do the Washing', icon: '👕', task_type: 'chore',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', due_time: '09:00',
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-beth-groceries', family_id: FAMILY_ID, assigned_to: 'member-beth',
    title: 'Grocery Shopping', icon: '🛒', task_type: 'chore',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA', due_time: '09:00',
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-beth-kitchen',   family_id: FAMILY_ID, assigned_to: 'member-beth',
    title: 'Clean Kitchen', icon: '🍽️', task_type: 'chore',
    recurrence_rule: 'FREQ=DAILY', due_time: '19:30',
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-beth-lunchprep', family_id: FAMILY_ID, assigned_to: 'member-beth',
    title: 'Prepare School Lunches', icon: '🥪', task_type: 'routine',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', due_time: '07:30',
    xp_value: 0, requires_approval: false, is_active: true, steps: [] },

  /* ─ Lucas ─ */
  { id: 'tmpl-lucas-bedroom', family_id: FAMILY_ID, assigned_to: 'member-lucas',
    title: 'Tidy Bedroom', icon: '🛏️', task_type: 'chore',
    recurrence_rule: 'FREQ=DAILY', due_time: '08:00',
    xp_value: 10, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-lucas-bins',    family_id: FAMILY_ID, assigned_to: 'member-lucas',
    title: 'Put Bins Out', icon: '🗑️', task_type: 'chore',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=WE', due_time: '07:30',
    xp_value: 15, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-lucas-table',   family_id: FAMILY_ID, assigned_to: 'member-lucas',
    title: 'Set/Clear Dinner Table', icon: '🍴', task_type: 'chore',
    recurrence_rule: 'FREQ=DAILY', due_time: '18:00',
    xp_value: 10, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-lucas-reading', family_id: FAMILY_ID, assigned_to: 'member-lucas',
    title: 'Reading (20 min)', icon: '📚', task_type: 'habit',
    recurrence_rule: 'FREQ=DAILY', due_time: '20:00',
    xp_value: 10, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-lucas-vacuum',  family_id: FAMILY_ID, assigned_to: 'member-lucas',
    title: 'Vacuum Living Room', icon: '🧹', task_type: 'chore',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA', due_time: null,
    xp_value: 20, requires_approval: true, is_active: true, steps: [] },

  /* ─ Jacob ─ */
  { id: 'tmpl-jacob-bedroom', family_id: FAMILY_ID, assigned_to: 'member-jacob',
    title: 'Tidy Bedroom', icon: '🛏️', task_type: 'chore',
    recurrence_rule: 'FREQ=DAILY', due_time: '08:00',
    xp_value: 10, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-jacob-reading', family_id: FAMILY_ID, assigned_to: 'member-jacob',
    title: 'Reading Practice (20 min)', icon: '📖', task_type: 'habit',
    recurrence_rule: 'FREQ=DAILY', due_time: '19:00',
    xp_value: 15, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-jacob-homework', family_id: FAMILY_ID, assigned_to: 'member-jacob',
    title: 'Homework', icon: '✏️', task_type: 'routine',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', due_time: '16:30',
    xp_value: 20, requires_approval: true, is_active: true, steps: [] },
  { id: 'tmpl-jacob-outside', family_id: FAMILY_ID, assigned_to: 'member-jacob',
    title: '20 Min Outside Activity', icon: '🏃', task_type: 'habit',
    recurrence_rule: 'FREQ=DAILY', due_time: '16:00',
    xp_value: 15, requires_approval: false, is_active: true, steps: [] },
  { id: 'tmpl-jacob-peac',    family_id: FAMILY_ID, assigned_to: 'member-jacob',
    title: 'PeaC Prep Study', icon: '🏆', task_type: 'habit',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', due_time: '17:00',
    xp_value: 25, requires_approval: true, is_active: true, steps: [] },

  /* ─ Bodhi (icon-mode steps) ─ */
  { id: 'tmpl-bodhi-getdressed', family_id: FAMILY_ID, assigned_to: 'member-bodhi',
    title: 'Get Dressed', icon: '👕', task_type: 'routine',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', due_time: '07:30',
    xp_value: 5, requires_approval: false, is_active: true,
    steps: [
      { step_order:1, instruction:'Take off pyjamas',            icon_url:'😴' },
      { step_order:2, instruction:'Put on undies',               icon_url:'👙' },
      { step_order:3, instruction:'Put on shirt',                icon_url:'👕' },
      { step_order:4, instruction:'Put on shorts',               icon_url:'👖' },
      { step_order:5, instruction:'Put on shoes & socks',        icon_url:'👟' },
    ] },
  { id: 'tmpl-bodhi-teeth', family_id: FAMILY_ID, assigned_to: 'member-bodhi',
    title: 'Clean Teeth', icon: '🦷', task_type: 'routine',
    recurrence_rule: 'FREQ=DAILY', due_time: '07:45',
    xp_value: 5, requires_approval: false, is_active: true,
    steps: [
      { step_order:1, instruction:'Get your toothbrush',         icon_url:'🪥' },
      { step_order:2, instruction:'Put toothpaste on',           icon_url:'🧴' },
      { step_order:3, instruction:'Brush top teeth',             icon_url:'😁' },
      { step_order:4, instruction:'Brush bottom teeth',          icon_url:'😁' },
      { step_order:5, instruction:'Rinse and spit',              icon_url:'💧' },
    ] },
  { id: 'tmpl-bodhi-bag', family_id: FAMILY_ID, assigned_to: 'member-bodhi',
    title: 'Pack School Bag', icon: '🎒', task_type: 'routine',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', due_time: '08:00',
    xp_value: 5, requires_approval: false, is_active: true,
    steps: [
      { step_order:1, instruction:'Put in your reader book',     icon_url:'📗' },
      { step_order:2, instruction:'Put in your lunchbox',        icon_url:'🍱' },
      { step_order:3, instruction:'Put in your drink bottle',    icon_url:'💧' },
      { step_order:4, instruction:'Zip up your bag',             icon_url:'🎒' },
    ] },
  { id: 'tmpl-bodhi-toys', family_id: FAMILY_ID, assigned_to: 'member-bodhi',
    title: 'Tidy Toys Away', icon: '🧸', task_type: 'chore',
    recurrence_rule: 'FREQ=DAILY', due_time: '17:30',
    xp_value: 5, requires_approval: false, is_active: true,
    steps: [
      { step_order:1, instruction:'Pick up toys from the floor', icon_url:'🧸' },
      { step_order:2, instruction:'Put them in the toy box',     icon_url:'📦' },
    ] },
  { id: 'tmpl-bodhi-speech', family_id: FAMILY_ID, assigned_to: 'member-bodhi',
    title: 'Speech Therapy Homework', icon: '🗣️', task_type: 'habit',
    recurrence_rule: 'FREQ=DAILY', due_time: '17:00',
    xp_value: 10, requires_approval: true, is_active: true,
    steps: [
      { step_order:1, instruction:'Get your speech book',        icon_url:'📔' },
      { step_order:2, instruction:'Do exercise 1',               icon_url:'👄' },
      { step_order:3, instruction:'Do exercise 2',               icon_url:'👄' },
      { step_order:4, instruction:"Tell Mum or Dad you're done", icon_url:'🙋' },
    ] },
];

/* ── Milestones ──────────────────────────── */
const MILESTONES = [
  { id: uid(), member_id: 'member-lucas', label: 'New Lego Set 🧱',
    xp_target: 300, reward_description: 'Choose any Lego set up to $60',
    achieved_at: null, celebration_type: 'fireworks' },
  { id: uid(), member_id: 'member-lucas', label: 'Movie Night Pick 🎬',
    xp_target: 150, reward_description: 'You pick the Friday movie',
    achieved_at: null, celebration_type: 'confetti' },
  { id: uid(), member_id: 'member-jacob', label: 'PeaC Goal! 🏆',
    xp_target: 400, reward_description: 'Celebrate making PeaC with a special outing',
    achieved_at: null, celebration_type: 'fireworks' },
  { id: uid(), member_id: 'member-jacob', label: 'Movie Night Pick 🎬',
    xp_target: 150, reward_description: 'You pick the Friday movie',
    achieved_at: null, celebration_type: 'confetti' },
  { id: uid(), member_id: 'member-jacob', label: 'Minecraft Top-Up 🎮',
    xp_target: 250, reward_description: '$10 Minecraft store credit',
    achieved_at: null, celebration_type: 'confetti' },
  { id: uid(), member_id: 'member-bodhi', label: 'Movie Night Pick 🎬',
    xp_target: 100, reward_description: 'You pick the movie!',
    achieved_at: null, celebration_type: 'confetti' },
  { id: uid(), member_id: 'member-bodhi', label: 'New Football Boots ⚽',
    xp_target: 200, reward_description: 'Pick your new boots',
    achieved_at: null, celebration_type: 'fireworks' },
];

/* ── Initial XP history ──────────────────── */
const buildXPLedger = () => {
  const entries = [];
  const add = (memberId, delta, reason, daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    entries.push({ id: uid(), member_id: memberId, instance_id: null,
      xp_delta: delta, reason, note: null, awarded_by: null, created_at: d.toISOString() });
  };
  // Lucas — 180 XP
  [10,10,15,10,20,10,15,10,10,10,20].forEach((xp, i) => add('member-lucas', xp, 'task', 6-Math.floor(i/2)));
  // Jacob — 140 XP
  [15,20,15,10,25,15,10,15,15].forEach((xp, i) => add('member-jacob', xp, 'task', 6-Math.floor(i/2)));
  // Bodhi — 85 XP
  [5,10,5,5,5,10,5,5,5,5,10,5,10].forEach((xp, i) => add('member-bodhi', xp, i===5||i===12 ? 'bonus' : 'task', 5-Math.floor(i/3)));
  return entries;
};

/* ── Recipes ─────────────────────────────── */
const RECIPES = [
  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale',
    name: 'Spaghetti Bolognese', icon: '🍝',
    ingredients: [
      { name:'Beef mince', qty:'500g' }, { name:'Spaghetti', qty:'400g' },
      { name:'Tinned tomatoes', qty:'2 cans' }, { name:'Onion', qty:'1 large' },
      { name:'Garlic', qty:'3 cloves' }, { name:'Carrots', qty:'2' },
      { name:'Celery', qty:'2 stalks' }, { name:'Olive oil', qty:'2 tbsp' },
    ],
    steps: ['Brown mince with oil','Add diced onion, carrot, celery — cook 5 min',
            'Add garlic, cook 1 min','Add tomatoes, simmer 20 min','Cook spaghetti and serve'],
    source_url: null, ai_generated: false },

  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale',
    name: 'Chicken Stir-Fry', icon: '🍜',
    ingredients: [
      { name:'Chicken breast', qty:'600g' }, { name:'Broccoli', qty:'1 head' },
      { name:'Capsicum', qty:'1' }, { name:'Soy sauce', qty:'3 tbsp' },
      { name:'Garlic', qty:'2 cloves' }, { name:'Ginger', qty:'1 tsp' }, { name:'Rice', qty:'2 cups' },
    ],
    steps: ['Cook rice','Slice chicken, fry until golden','Add veggies, stir-fry 4 min',
            'Add soy sauce, garlic, ginger','Serve over rice'],
    source_url: null, ai_generated: false },

  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale',
    name: 'Roast Chicken', icon: '🍗',
    ingredients: [
      { name:'Whole chicken', qty:'1.8kg' }, { name:'Potatoes', qty:'6 medium' },
      { name:'Rosemary', qty:'handful' }, { name:'Garlic', qty:'1 head' },
      { name:'Olive oil', qty:'3 tbsp' }, { name:'Lemon', qty:'1' },
    ],
    steps: ['Preheat oven 200°C','Season chicken, stuff with lemon & rosemary',
            'Roast 90 min','Rest 15 min, roast potatoes alongside'],
    source_url: null, ai_generated: false },

  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale',
    name: 'Fish Tacos', icon: '🌮',
    ingredients: [
      { name:'White fish fillets', qty:'500g' }, { name:'Soft tortillas', qty:'8' },
      { name:'Cabbage', qty:'¼ head' }, { name:'Lime', qty:'2' },
      { name:'Sour cream', qty:'¼ cup' }, { name:'Avocado', qty:'1' },
    ],
    steps: ['Season and pan-fry fish 3 min each side','Warm tortillas',
            'Shred cabbage, slice avocado','Assemble with sour cream and lime'],
    source_url: null, ai_generated: false },

  { id: uid(), family_id: FAMILY_ID, created_by: 'member-dale',
    name: 'Homemade Pizza', icon: '🍕',
    ingredients: [
      { name:'Pizza bases', qty:'4' }, { name:'Tomato paste', qty:'1 tube' },
      { name:'Mozzarella', qty:'400g' }, { name:'Toppings of choice', qty:'as needed' },
    ],
    steps: ['Preheat oven 220°C','Spread tomato paste on bases',
            'Add cheese and toppings','Bake 12–15 min until golden'],
    source_url: null, ai_generated: false },

  { id: uid(), family_id: FAMILY_ID, created_by: 'member-beth',
    name: 'Chicken Fried Rice', icon: '🍚',
    ingredients: [
      { name:'Cooked rice (day-old)', qty:'3 cups' }, { name:'Chicken', qty:'400g' },
      { name:'Eggs', qty:'3' }, { name:'Frozen peas & corn', qty:'1 cup' },
      { name:'Soy sauce', qty:'3 tbsp' }, { name:'Sesame oil', qty:'1 tsp' },
    ],
    steps: ['Fry chicken in wok, remove','Scramble eggs, add rice and break up',
            'Add chicken and peas','Season with soy sauce and sesame oil'],
    source_url: null, ai_generated: false },
];

/* ── Lists ───────────────────────────────── */
const LISTS = [
  { id: 'list-grocery', family_id: FAMILY_ID, name: 'Grocery List', list_type: 'grocery', icon: '🛒', is_shared: true },
  { id: 'list-sport',   family_id: FAMILY_ID, name: 'Sports Bag',   list_type: 'packing', icon: '⚽', is_shared: false },
  { id: 'list-todo',    family_id: FAMILY_ID, name: 'Family To-Do', list_type: 'todo',    icon: '📋', is_shared: true },
];

const LIST_ITEMS = {
  'list-grocery': [
    { id: uid(), list_id:'list-grocery', added_by:'member-beth', text:'Full cream milk (3L)',        category:'Dairy',  is_ticked:false, sort_order:1 },
    { id: uid(), list_id:'list-grocery', added_by:'member-beth', text:'Bread (wholegrain)',          category:'Bakery', is_ticked:false, sort_order:2 },
    { id: uid(), list_id:'list-grocery', added_by:'member-beth', text:'Eggs (12 pack)',              category:'Dairy',  is_ticked:true,  sort_order:3 },
    { id: uid(), list_id:'list-grocery', added_by:'member-dale', text:'Beef mince (1kg)',            category:'Meat',   is_ticked:false, sort_order:4 },
    { id: uid(), list_id:'list-grocery', added_by:'member-dale', text:'Chicken breasts',             category:'Meat',   is_ticked:false, sort_order:5 },
    { id: uid(), list_id:'list-grocery', added_by:'member-beth', text:'Broccoli',                   category:'Produce',is_ticked:false, sort_order:6 },
    { id: uid(), list_id:'list-grocery', added_by:'member-beth', text:'Bananas',                    category:'Produce',is_ticked:false, sort_order:7 },
    { id: uid(), list_id:'list-grocery', added_by:'member-dale', text:'Spaghetti (500g)',            category:'Pantry', is_ticked:false, sort_order:8 },
    { id: uid(), list_id:'list-grocery', added_by:'member-dale', text:'Tinned tomatoes (4 cans)',   category:'Pantry', is_ticked:false, sort_order:9 },
    { id: uid(), list_id:'list-grocery', added_by:'member-beth', text:'Kids yoghurt pouches',       category:'Dairy',  is_ticked:false, sort_order:10 },
  ],
  'list-sport': [
    { id: uid(), list_id:'list-sport', added_by:'member-beth', text:'Football boots',   category:null, is_ticked:true,  sort_order:1 },
    { id: uid(), list_id:'list-sport', added_by:'member-beth', text:'Football socks',   category:null, is_ticked:false, sort_order:2 },
    { id: uid(), list_id:'list-sport', added_by:'member-beth', text:'Shin guards',      category:null, is_ticked:true,  sort_order:3 },
    { id: uid(), list_id:'list-sport', added_by:'member-beth', text:'Water bottle',     category:null, is_ticked:false, sort_order:4 },
    { id: uid(), list_id:'list-sport', added_by:'member-beth', text:'Mouthguard',       category:null, is_ticked:true,  sort_order:5 },
  ],
  'list-todo': [
    { id: uid(), list_id:'list-todo', added_by:'member-dale', text:'Book car service',               category:null, is_ticked:false, sort_order:1 },
    { id: uid(), list_id:'list-todo', added_by:'member-beth', text:"Sign permission slip",           category:null, is_ticked:false, sort_order:2 },
    { id: uid(), list_id:'list-todo', added_by:'member-dale', text:'Fix back gate latch',            category:null, is_ticked:false, sort_order:3 },
    { id: uid(), list_id:'list-todo', added_by:'member-beth', text:'Order school photos',            category:null, is_ticked:true,  sort_order:4 },
  ],
};

/* ── Meal Plan (current week) ────────────── */
const buildMealPlan = (recipes) => {
  const weekStartStr = toDateStr(weekStart(now));
  const [spagBol, stirFry, roast, tacos, pizza, friedRice] = recipes;
  return {
    week_start: weekStartStr,
    slots: [
      { day_of_week:1, meal_type:'breakfast', recipe_id:null,          free_text:'Toast & Vegemite 🍞' },
      { day_of_week:1, meal_type:'lunch',     recipe_id:null,          free_text:'School lunch 🥪' },
      { day_of_week:1, meal_type:'dinner',    recipe_id:spagBol.id,    free_text:null },
      { day_of_week:2, meal_type:'breakfast', recipe_id:null,          free_text:'Cereal & Fruit 🥣' },
      { day_of_week:2, meal_type:'lunch',     recipe_id:null,          free_text:'School lunch 🥪' },
      { day_of_week:2, meal_type:'dinner',    recipe_id:stirFry.id,    free_text:null },
      { day_of_week:3, meal_type:'breakfast', recipe_id:null,          free_text:'Eggs on toast 🍳' },
      { day_of_week:3, meal_type:'lunch',     recipe_id:null,          free_text:'School lunch 🥪' },
      { day_of_week:3, meal_type:'dinner',    recipe_id:roast.id,      free_text:null },
      { day_of_week:4, meal_type:'breakfast', recipe_id:null,          free_text:'Toast & Vegemite 🍞' },
      { day_of_week:4, meal_type:'lunch',     recipe_id:null,          free_text:'School lunch 🥪' },
      { day_of_week:4, meal_type:'dinner',    recipe_id:tacos.id,      free_text:null },
      { day_of_week:5, meal_type:'breakfast', recipe_id:null,          free_text:'Pancakes 🥞' },
      { day_of_week:5, meal_type:'lunch',     recipe_id:null,          free_text:'School lunch 🥪' },
      { day_of_week:5, meal_type:'dinner',    recipe_id:pizza.id,      free_text:null },
      { day_of_week:6, meal_type:'breakfast', recipe_id:null,          free_text:'Big brekky 🥓🍳' },
      { day_of_week:6, meal_type:'lunch',     recipe_id:null,          free_text:'Leftovers / Wraps 🌯' },
      { day_of_week:6, meal_type:'dinner',    recipe_id:friedRice.id,  free_text:null },
      { day_of_week:7, meal_type:'breakfast', recipe_id:null,          free_text:'Croissants 🥐' },
      { day_of_week:7, meal_type:'lunch',     recipe_id:null,          free_text:'Toasted sandwiches 🥪' },
      { day_of_week:7, meal_type:'dinner',    recipe_id:null,          free_text:'Takeaway night 🍕' },
    ],
  };
};

/* ── Main seed function ──────────────────── */
export function seedNaughtonFamily() {
  if (DB.isInitialized()) return;

  DB.setMembers(MEMBERS);
  DB.setActiveMemberId(MEMBERS[0].id);
  DB._set('events', buildEvents());
  DB.setTaskTemplates(TASK_TEMPLATES);
  DB._set('milestones', MILESTONES);
  DB._set('xp_ledger', buildXPLedger());

  const recipes = RECIPES;
  DB.setRecipes(recipes);
  DB.setMealPlan(toDateStr(weekStart(now)), buildMealPlan(recipes));

  DB.setLists(LISTS);
  Object.entries(LIST_ITEMS).forEach(([listId, items]) => DB.setListItems(listId, items));

  DB.setSettings({
    admin_pin:        CONFIG.admin_pin,
    idle_timeout_secs: CONFIG.idle_timeout_secs,
    screensaver_enabled: true,
    family_name:      CONFIG.family_name,
    timezone:         CONFIG.timezone,
    locale:           CONFIG.locale,
  });

  DB.markInitialized();
}

/* ── Today's task instance generator ──────── */
export function generateTodayInstances() {
  const today  = toDateStr();
  if (DB.getTaskInstances(today).length > 0) return;

  const BYDAY = { MO:1, TU:2, WE:3, TH:4, FR:5, SA:6, SU:0 };
  const dow   = new Date().getDay();

  const isDue = (rule) => {
    if (!rule) return false;
    if (rule.includes('FREQ=DAILY')) return true;
    if (rule.includes('FREQ=WEEKLY')) {
      const m = rule.match(/BYDAY=([A-Z,]+)/);
      return m ? m[1].split(',').map(d => BYDAY[d]).includes(dow) : dow === 1;
    }
    if (rule.includes('FREQ=MONTHLY')) {
      const m = rule.match(/BYMONTHDAY=(\d+)/);
      return m ? new Date().getDate() === parseInt(m[1]) : new Date().getDate() === 1;
    }
    return false;
  };

  const instances = DB.getTaskTemplates()
    .filter(t => t.is_active && isDue(t.recurrence_rule))
    .map(t => ({
      id: uid(), template_id: t.id, assigned_to: t.assigned_to,
      title: t.title, icon: t.icon, due_date: today, due_time: t.due_time || null,
      xp_value: t.xp_value, requires_approval: t.requires_approval, task_type: t.task_type,
      status: 'pending', completed_at: null, xp_awarded: null, steps: t.steps || [],
    }));

  DB.setTaskInstances(today, instances);
}
