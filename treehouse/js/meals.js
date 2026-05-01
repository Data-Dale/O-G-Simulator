/* ─────────────────────────────────────────────
   meals.js — Meal planner screen
   ───────────────────────────────────────────── */

import DB from './db.js';
import { AppState, openModal, closeModal } from './app.js';
import { uid, todayStr, toDateStr, weekStart, addDays, formatDate, escHtml } from './utils.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: '🌅 Breakfast', lunch: '🌤️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snack' };
const DAY_NAMES  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

let mealsViewDate = new Date();

export function renderMeals(container) {
  const weekStartD = weekStart(mealsViewDate);
  const weekStartStr = toDateStr(weekStartD);
  const today = todayStr();
  const todayDow = ((new Date().getDay() + 6) % 7) + 1;

  const dates = Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStartD, i)));

  container.innerHTML = `
    <div class="meals-toolbar">
      <button class="btn btn-secondary btn-sm" id="meals-prev">◀</button>
      <h2>Week of ${formatDate(weekStartD, 'short')}</h2>
      <button class="btn btn-secondary btn-sm" id="meals-today">This week</button>
      <button class="btn btn-secondary btn-sm" id="meals-next">▶</button>
    </div>
    <div class="meals-body">
      <div class="meal-grid-wrap">
        <div class="meal-grid">
          <!-- Header row -->
          <div></div>
          ${dates.map((ds, i) => {
            const d = new Date(ds + 'T00:00:00');
            const isToday = ds === today;
            return `<div class="meal-grid-header${isToday ? ' today' : ''}">${DAY_NAMES[i]}<br><span style="font-size:16px;font-weight:700">${d.getDate()}</span></div>`;
          }).join('')}

          <!-- Meal rows -->
          ${MEAL_TYPES.map(mealType => `
            <div class="meal-row-label">${MEAL_LABELS[mealType].split(' ')[0]}<br><span style="font-size:9px">${mealType.charAt(0).toUpperCase()+mealType.slice(1)}</span></div>
            ${dates.map((ds, i) => {
              const dow = i + 1; // 1=Mon…7=Sun
              const slot = DB.getMealSlot(weekStartStr, dow, mealType);
              const recipe = slot?.recipe_id ? DB.getRecipe(slot.recipe_id) : null;
              const isToday = ds === today;
              const todaySlot = isToday && dow === todayDow;

              return `
                <div class="meal-slot${isToday ? ' today-slot' : ''}${slot ? ' has-meal' : ''}"
                     data-dow="${dow}" data-meal-type="${mealType}" data-week="${weekStartStr}"
                     title="${slot ? (recipe?.name || slot.free_text || '') : 'Click to plan'}">
                  ${slot
                    ? `<div class="meal-slot-name">${recipe?.icon || ''} ${escHtml(recipe?.name || slot.free_text || '')}</div>
                       ${recipe ? `<div class="meal-slot-recipe">Recipe</div>` : ''}`
                    : `<div class="meal-slot-empty"><span class="meal-slot-add">＋</span></div>`}
                </div>`;
            }).join('')}
          `).join('')}
        </div>
      </div>

      <!-- Recipe panel -->
      <div class="recipe-panel">
        <div class="recipe-panel-header">
          Recipes
          <button class="btn btn-sm btn-primary" id="add-recipe-btn">＋ Add</button>
        </div>
        <div class="recipe-list" id="recipe-list">
          ${renderRecipeList()}
        </div>
      </div>
    </div>`;

  // Wire navigation
  container.querySelector('#meals-prev').addEventListener('click', () => {
    mealsViewDate = addDays(mealsViewDate, -7);
    renderMeals(container);
  });
  container.querySelector('#meals-next').addEventListener('click', () => {
    mealsViewDate = addDays(mealsViewDate, 7);
    renderMeals(container);
  });
  container.querySelector('#meals-today').addEventListener('click', () => {
    mealsViewDate = new Date();
    renderMeals(container);
  });

  // Wire meal slot clicks
  container.querySelectorAll('.meal-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const dow      = parseInt(slot.dataset.dow);
      const mealType = slot.dataset.mealType;
      const week     = slot.dataset.week;
      openSlotModal(dow, mealType, week, container);
    });
  });

  // Wire recipe clicks
  container.querySelectorAll('.recipe-item').forEach(item => {
    item.addEventListener('click', () => {
      const recipeId = item.dataset.recipeId;
      openRecipeDetailModal(recipeId, container);
    });
  });

  // Add recipe
  container.querySelector('#add-recipe-btn').addEventListener('click', () => openAddRecipeModal(container));
}

/* ── Recipe List ──────────────────────────── */
function renderRecipeList() {
  const recipes = DB.getRecipes();
  if (recipes.length === 0) return `<div class="empty-state"><p>No recipes yet</p></div>`;
  return recipes.map(r => `
    <div class="recipe-item" data-recipe-id="${r.id}">
      <span class="recipe-item-icon">${r.icon || '🍽️'}</span>
      <div>
        <div class="recipe-item-name">${escHtml(r.name)}</div>
        <div class="recipe-item-meta">${r.ingredients?.length || 0} ingredients</div>
      </div>
    </div>`).join('');
}

/* ── Meal Slot Modal ──────────────────────── */
function openSlotModal(dow, mealType, weekStartStr, container) {
  const recipes   = DB.getRecipes();
  const existing  = DB.getMealSlot(weekStartStr, dow, mealType);
  const existingR = existing?.recipe_id ? DB.getRecipe(existing.recipe_id) : null;

  openModal(`Plan ${MEAL_LABELS[mealType]} for ${DAY_NAMES[dow-1]}`, `
    <div class="form-group">
      <label class="form-label">Choose a recipe</label>
      <select class="form-control" id="slot-recipe">
        <option value="">— No recipe / free text —</option>
        ${recipes.map(r => `<option value="${r.id}"${existing?.recipe_id === r.id ? ' selected' : ''}>${r.icon || ''} ${escHtml(r.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Or free text</label>
      <input class="form-control" id="slot-text" type="text" placeholder="e.g. Toast & Vegemite"
             value="${existing?.free_text ? escHtml(existing.free_text) : ''}">
    </div>
    <div class="form-actions">
      ${existing ? `<button class="btn btn-danger btn-sm" id="slot-clear">Clear</button>` : ''}
      <button class="btn btn-secondary" id="slot-cancel">Cancel</button>
      <button class="btn btn-primary" id="slot-save">Save</button>
    </div>
  `);

  document.getElementById('slot-cancel').addEventListener('click', closeModal);
  document.getElementById('slot-clear')?.addEventListener('click', () => {
    // Remove slot
    const plan = DB.getMealPlan(weekStartStr) || { week_start: weekStartStr, slots: [] };
    plan.slots = plan.slots.filter(s => !(s.day_of_week === dow && s.meal_type === mealType));
    DB.setMealPlan(weekStartStr, plan);
    closeModal();
    renderMeals(container);
  });
  document.getElementById('slot-save').addEventListener('click', () => {
    const recipeId = document.getElementById('slot-recipe').value || null;
    const freeText = document.getElementById('slot-text').value.trim() || null;
    DB.setMealSlot(weekStartStr, dow, mealType, {
      day_of_week: dow,
      meal_type: mealType,
      recipe_id: recipeId,
      free_text: recipeId ? null : freeText,
    });
    closeModal();
    renderMeals(container);
  });
}

/* ── Recipe Detail Modal ──────────────────── */
function openRecipeDetailModal(recipeId, container) {
  const r = DB.getRecipe(recipeId);
  if (!r) return;

  openModal(`${r.icon || '🍽️'} ${r.name}`, `
    <div style="display:flex;flex-direction:column;gap:16px">
      ${r.source_url ? `<div style="font-size:13px"><a href="${escHtml(r.source_url)}" style="color:var(--info)">Source recipe →</a></div>` : ''}

      <div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:8px">Ingredients</div>
        ${(r.ingredients || []).map(ing => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span>${escHtml(ing.name)}</span>
            <span style="color:var(--text-dim)">${escHtml(ing.qty)}</span>
          </div>`).join('')}
        <button class="btn btn-sm btn-secondary" id="add-to-grocery" style="margin-top:8px">
          🛒 Add to Grocery List
        </button>
      </div>

      <div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:8px">Steps</div>
        ${(r.steps || []).map((step, i) => `
          <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="font-weight:700;color:var(--text-dim);min-width:24px">${i+1}.</span>
            <span>${escHtml(step)}</span>
          </div>`).join('')}
      </div>

      <div class="form-actions">
        <button class="btn btn-danger btn-sm" id="delete-recipe-btn">Delete</button>
        <button class="btn btn-secondary" id="recipe-close">Close</button>
      </div>
    </div>
  `, { wide: true });

  document.getElementById('recipe-close').addEventListener('click', closeModal);

  document.getElementById('add-to-grocery').addEventListener('click', () => {
    const groceryList = DB.getList('list-grocery');
    if (!groceryList) { alert('No grocery list found.'); return; }
    (r.ingredients || []).forEach(ing => {
      DB.addListItem('list-grocery', {
        id: uid(),
        list_id: 'list-grocery',
        added_by: AppState.currentMember?.id || 'member-dale',
        text: `${ing.name} (${ing.qty}) — for ${r.name}`,
        category: 'Recipe Ingredient',
        is_ticked: false,
        sort_order: 999,
      });
    });
    alert(`${r.ingredients?.length || 0} ingredients added to grocery list!`);
  });

  document.getElementById('delete-recipe-btn').addEventListener('click', () => {
    if (confirm(`Delete "${r.name}"?`)) {
      const recipes = DB.getRecipes().filter(x => x.id !== r.id);
      DB.setRecipes(recipes);
      closeModal();
      renderMeals(container);
    }
  });
}

/* ── Add Recipe Modal ─────────────────────── */
function openAddRecipeModal(container) {
  openModal('Add Recipe', `
    <div class="form-group">
      <label class="form-label">Recipe Name</label>
      <input class="form-control" id="r-name" type="text" placeholder="e.g. Spaghetti Bolognese" maxlength="200">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Icon (emoji)</label>
        <input class="form-control" id="r-icon" type="text" placeholder="🍝" maxlength="4" style="font-size:24px;text-align:center">
      </div>
      <div class="form-group">
        <label class="form-label">Source URL</label>
        <input class="form-control" id="r-url" type="url" placeholder="Optional website link">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Ingredients (one per line: name, qty)</label>
      <textarea class="form-control" id="r-ingredients" rows="5" placeholder="Beef mince, 500g&#10;Spaghetti, 400g&#10;Onion, 1 large"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Steps (one per line)</label>
      <textarea class="form-control" id="r-steps" rows="5" placeholder="Brown the mince&#10;Add onion and garlic&#10;Simmer 20 minutes"></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" id="r-cancel">Cancel</button>
      <button class="btn btn-primary" id="r-save">Save Recipe</button>
    </div>
  `, { wide: true });

  document.getElementById('r-cancel').addEventListener('click', closeModal);
  document.getElementById('r-save').addEventListener('click', () => {
    const name = document.getElementById('r-name').value.trim();
    if (!name) { alert('Please enter a recipe name.'); return; }
    const icon = document.getElementById('r-icon').value.trim() || '🍽️';
    const url  = document.getElementById('r-url').value.trim() || null;

    const ingredientLines = document.getElementById('r-ingredients').value.trim().split('\n').filter(l => l.trim());
    const ingredients = ingredientLines.map(l => {
      const parts = l.split(',');
      return { name: parts[0]?.trim() || l, qty: parts[1]?.trim() || '' };
    });

    const steps = document.getElementById('r-steps').value.trim().split('\n').filter(l => l.trim());

    const recipe = {
      id: uid(),
      family_id: 'naughton-family-001',
      created_by: AppState.currentMember?.id || 'member-dale',
      name, icon, ingredients, steps,
      source_url: url,
      ai_generated: false,
    };

    DB.addRecipe(recipe);
    closeModal();
    renderMeals(container);
  });
}
