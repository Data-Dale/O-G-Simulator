/* ─────────────────────────────────────────────
   db.js — localStorage data layer for Treehouse
   ───────────────────────────────────────────── */

const PREFIX = 'th:';

const DB = {

  /* ── Generic ─────────────────────────────── */
  _get: (key) => {
    try { return JSON.parse(localStorage.getItem(PREFIX + key)); }
    catch { return null; }
  },
  _set: (key, val) => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); }
    catch (e) { console.error('DB write failed:', key, e); }
  },

  /* ── Initialization ─────────────────────── */
  isInitialized: () => !!DB._get('initialized'),
  markInitialized: () => DB._set('initialized', true),

  /* ── Members ─────────────────────────────── */
  getMembers: () => DB._get('members') || [],
  setMembers: (members) => DB._set('members', members),
  getMember: (id) => (DB.getMembers()).find(m => m.id === id) || null,
  updateMember: (id, updates) => {
    const members = DB.getMembers().map(m => m.id === id ? { ...m, ...updates } : m);
    DB.setMembers(members);
  },

  /* ── Active member ───────────────────────── */
  getActiveMemberId: () => DB._get('active_member') || null,
  setActiveMemberId: (id) => DB._set('active_member', id),
  getActiveMember: () => {
    const id = DB.getActiveMemberId();
    return id ? DB.getMember(id) : null;
  },

  /* ── Events ──────────────────────────────── */
  getEvents: () => DB._get('events') || [],
  setEvents: (events) => DB._set('events', events),
  addEvent: (event) => {
    const events = DB.getEvents();
    events.push(event);
    DB.setEvents(events);
    return event;
  },
  updateEvent: (id, updates) => {
    const events = DB.getEvents().map(e => e.id === id ? { ...e, ...updates } : e);
    DB.setEvents(events);
  },
  deleteEvent: (id) => {
    DB.setEvents(DB.getEvents().filter(e => e.id !== id));
  },
  getEventsForDate: (dateStr) => {
    return DB.getEvents().filter(e => {
      const start = e.starts_at.slice(0, 10);
      const end   = e.ends_at.slice(0, 10);
      return start <= dateStr && end >= dateStr;
    });
  },
  getEventsForWeek: (weekStartStr, weekEndStr) => {
    return DB.getEvents().filter(e => {
      const start = e.starts_at.slice(0, 10);
      return start >= weekStartStr && start <= weekEndStr;
    });
  },

  /* ── Task Templates ──────────────────────── */
  getTaskTemplates: () => DB._get('task_templates') || [],
  setTaskTemplates: (templates) => DB._set('task_templates', templates),
  addTaskTemplate: (t) => {
    const templates = DB.getTaskTemplates();
    templates.push(t);
    DB.setTaskTemplates(templates);
    return t;
  },
  updateTaskTemplate: (id, updates) => {
    const templates = DB.getTaskTemplates().map(t => t.id === id ? { ...t, ...updates } : t);
    DB.setTaskTemplates(templates);
  },
  deleteTaskTemplate: (id) => {
    DB.setTaskTemplates(DB.getTaskTemplates().filter(t => t.id !== id));
  },

  /* ── Task Instances ──────────────────────── */
  getTaskInstances: (dateStr) => {
    const all = DB._get('task_instances') || {};
    return all[dateStr] || [];
  },
  setTaskInstances: (dateStr, instances) => {
    const all = DB._get('task_instances') || {};
    all[dateStr] = instances;
    DB._set('task_instances', all);
  },
  updateTaskInstance: (dateStr, instanceId, updates) => {
    const instances = DB.getTaskInstances(dateStr).map(i =>
      i.id === instanceId ? { ...i, ...updates } : i
    );
    DB.setTaskInstances(dateStr, instances);
  },
  getTodayInstances: () => {
    const today = new Date().toISOString().slice(0, 10);
    return DB.getTaskInstances(today);
  },

  /* ── XP Ledger ───────────────────────────── */
  getXPLedger: () => DB._get('xp_ledger') || [],
  addXPEntry: (entry) => {
    const ledger = DB.getXPLedger();
    ledger.push(entry);
    DB._set('xp_ledger', ledger);
    return entry;
  },
  getMemberXP: (memberId) => {
    return DB.getXPLedger()
      .filter(e => e.member_id === memberId)
      .reduce((sum, e) => sum + e.xp_delta, 0);
  },
  getMemberXPToday: (memberId) => {
    const today = new Date().toISOString().slice(0, 10);
    return DB.getXPLedger()
      .filter(e => e.member_id === memberId && e.created_at.slice(0, 10) === today)
      .reduce((sum, e) => sum + e.xp_delta, 0);
  },

  /* ── Milestones ──────────────────────────── */
  getMilestones: (memberId) => {
    const all = DB._get('milestones') || [];
    return memberId ? all.filter(m => m.member_id === memberId) : all;
  },
  setMilestones: (milestones) => DB._set('milestones', milestones),
  updateMilestone: (id, updates) => {
    const milestones = (DB._get('milestones') || []).map(m =>
      m.id === id ? { ...m, ...updates } : m
    );
    DB.setMilestones(milestones);
  },

  /* ── Recipes ─────────────────────────────── */
  getRecipes: () => DB._get('recipes') || [],
  setRecipes: (recipes) => DB._set('recipes', recipes),
  addRecipe: (recipe) => {
    const recipes = DB.getRecipes();
    recipes.push(recipe);
    DB.setRecipes(recipes);
    return recipe;
  },
  getRecipe: (id) => DB.getRecipes().find(r => r.id === id) || null,

  /* ── Meal Plans ──────────────────────────── */
  getMealPlan: (weekStart) => {
    const all = DB._get('meal_plans') || {};
    return all[weekStart] || null;
  },
  setMealPlan: (weekStart, plan) => {
    const all = DB._get('meal_plans') || {};
    all[weekStart] = plan;
    DB._set('meal_plans', all);
  },
  getMealSlot: (weekStart, dayOfWeek, mealType) => {
    const plan = DB.getMealPlan(weekStart);
    if (!plan) return null;
    return (plan.slots || []).find(s => s.day_of_week === dayOfWeek && s.meal_type === mealType) || null;
  },
  setMealSlot: (weekStart, dayOfWeek, mealType, data) => {
    let plan = DB.getMealPlan(weekStart);
    if (!plan) plan = { week_start: weekStart, slots: [] };
    const idx = (plan.slots || []).findIndex(s => s.day_of_week === dayOfWeek && s.meal_type === mealType);
    if (idx >= 0) plan.slots[idx] = { ...plan.slots[idx], ...data };
    else plan.slots.push({ day_of_week: dayOfWeek, meal_type: mealType, ...data });
    DB.setMealPlan(weekStart, plan);
  },

  /* ── Lists ───────────────────────────────── */
  getLists: () => DB._get('lists') || [],
  setLists: (lists) => DB._set('lists', lists),
  addList: (list) => {
    const lists = DB.getLists();
    lists.push(list);
    DB.setLists(lists);
    return list;
  },
  getList: (id) => DB.getLists().find(l => l.id === id) || null,

  /* ── List Items ──────────────────────────── */
  getListItems: (listId) => {
    const all = DB._get('list_items') || {};
    return all[listId] || [];
  },
  setListItems: (listId, items) => {
    const all = DB._get('list_items') || {};
    all[listId] = items;
    DB._set('list_items', all);
  },
  addListItem: (listId, item) => {
    const items = DB.getListItems(listId);
    items.push(item);
    DB.setListItems(listId, items);
    return item;
  },
  updateListItem: (listId, itemId, updates) => {
    const items = DB.getListItems(listId).map(i =>
      i.id === itemId ? { ...i, ...updates } : i
    );
    DB.setListItems(listId, items);
  },
  deleteListItem: (listId, itemId) => {
    DB.setListItems(listId, DB.getListItems(listId).filter(i => i.id !== itemId));
  },
  clearTickedItems: (listId) => {
    DB.setListItems(listId, DB.getListItems(listId).filter(i => !i.is_ticked));
  },

  /* ── Settings ────────────────────────────── */
  getSettings: () => DB._get('settings') || {},
  setSettings: (s) => DB._set('settings', s),
  getSetting: (key, fallback = null) => {
    const s = DB.getSettings();
    return key in s ? s[key] : fallback;
  },
  setSetting: (key, val) => {
    const s = DB.getSettings();
    s[key] = val;
    DB.setSettings(s);
  },
};

export default DB;
