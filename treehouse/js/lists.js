/* ─────────────────────────────────────────────
   lists.js — Lists screen (grocery, packing, etc.)
   ───────────────────────────────────────────── */

import DB from './db.js';
import { AppState, openModal, closeModal } from './app.js';
import { uid, escHtml } from './utils.js';

let activeListId = 'list-grocery';

export function renderLists(container) {
  const lists = DB.getLists();
  if (lists.length && !lists.find(l => l.id === activeListId)) {
    activeListId = lists[0].id;
  }

  container.innerHTML = `
    <div class="lists-nav">
      <div class="lists-nav-header">Lists</div>
      ${lists.map(l => {
        const items = DB.getListItems(l.id);
        const remaining = items.filter(i => !i.is_ticked).length;
        return `
          <div class="list-nav-item${l.id === activeListId ? ' active' : ''}" data-list-id="${l.id}">
            <span class="list-nav-icon">${l.icon || '📋'}</span>
            <span class="list-nav-name">${escHtml(l.name)}</span>
            <span class="list-nav-count">${remaining}</span>
          </div>`;
      }).join('')}
      <div class="list-nav-item" id="new-list-btn" style="color:var(--brand)">
        <span class="list-nav-icon">＋</span>
        <span class="list-nav-name">New list</span>
      </div>
    </div>
    <div class="lists-content">
      <div id="lists-content-inner" style="display:contents"></div>
    </div>`;

  // Wire nav
  container.querySelectorAll('.list-nav-item[data-list-id]').forEach(item => {
    item.addEventListener('click', () => {
      activeListId = item.dataset.listId;
      container.querySelectorAll('.list-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderListContent(container);
    });
  });

  container.querySelector('#new-list-btn').addEventListener('click', () => openNewListModal(container));

  renderListContent(container);
}

/* ── List Content ─────────────────────────── */
function renderListContent(container) {
  const listsContent = container.querySelector('.lists-content');
  if (!listsContent) return;

  const list = DB.getList(activeListId);
  if (!list) {
    listsContent.innerHTML = `<div class="empty-state"><p>Select a list</p></div>`;
    return;
  }

  const items   = DB.getListItems(activeListId);
  const members = DB.getMembers();
  const isGrocery = list.list_type === 'grocery';

  listsContent.innerHTML = `
    <div class="lists-content-header">
      <span style="font-size:24px">${list.icon || '📋'}</span>
      <h2>${escHtml(list.name)}</h2>
      <span style="font-size:13px;color:var(--text-dim)">${items.filter(i=>!i.is_ticked).length} remaining</span>
      ${items.some(i => i.is_ticked) ? `<button class="btn btn-sm btn-secondary" id="clear-ticked">Clear ticked</button>` : ''}
      ${list.list_type !== 'packing' ? `<button class="btn btn-sm btn-secondary" id="delete-list-btn" style="color:var(--danger)">Delete list</button>` : ''}
    </div>

    <!-- Add item -->
    <div class="list-add-row">
      <input class="list-add-input" id="new-item-input" type="text"
             placeholder="Add item…" maxlength="300" autocomplete="off">
      ${isGrocery ? `
      <select class="form-control" id="new-item-cat" style="width:140px;min-height:var(--touch-min)">
        <option value="">Category</option>
        <option>Produce</option>
        <option>Dairy</option>
        <option>Meat</option>
        <option>Bakery</option>
        <option>Pantry</option>
        <option>Frozen</option>
        <option>Drinks</option>
        <option>Household</option>
        <option>Recipe Ingredient</option>
      </select>` : ''}
      <button class="btn btn-primary" id="add-item-btn">Add</button>
    </div>

    <!-- Items -->
    <div class="list-items-wrap" id="list-items-wrap">
      ${renderItems(items, members, isGrocery)}
    </div>
  `;

  // Wire add
  const addBtn   = listsContent.querySelector('#add-item-btn');
  const addInput = listsContent.querySelector('#new-item-input');

  const addItem = () => {
    const text = addInput.value.trim();
    if (!text) return;
    const cat = listsContent.querySelector('#new-item-cat')?.value || null;
    DB.addListItem(activeListId, {
      id: uid(),
      list_id: activeListId,
      added_by: AppState.currentMember?.id || 'member-dale',
      text,
      category: cat || null,
      is_ticked: false,
      sort_order: Date.now(),
    });
    addInput.value = '';
    refreshItems(listsContent, members, isGrocery);
    updateNavCounts(container);
  };

  addBtn.addEventListener('click', addItem);
  addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });

  // Wire tick / delete
  wireItems(listsContent, members, isGrocery, container);

  // Clear ticked
  listsContent.querySelector('#clear-ticked')?.addEventListener('click', () => {
    DB.clearTickedItems(activeListId);
    refreshItems(listsContent, members, isGrocery);
    updateNavCounts(container);
    // Refresh header
    renderListContent(container);
  });

  // Delete list
  listsContent.querySelector('#delete-list-btn')?.addEventListener('click', () => {
    if (confirm(`Delete "${list.name}"? This cannot be undone.`)) {
      const lists = DB.getLists().filter(l => l.id !== activeListId);
      DB.setLists(lists);
      activeListId = lists[0]?.id || '';
      renderLists(container);
    }
  });
}

/* ── Render items ─────────────────────────── */
function renderItems(items, members, isGrocery) {
  if (items.length === 0) {
    return `<div class="empty-state"><span class="empty-icon">📋</span><p>No items yet. Add something above!</p></div>`;
  }

  if (!isGrocery) {
    return items.map(item => renderItem(item, members)).join('');
  }

  // Grocery: group by category
  const categories = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    (categories[cat] = categories[cat] || []).push(item);
  });

  const catOrder = ['Produce','Dairy','Meat','Bakery','Pantry','Frozen','Drinks','Household','Recipe Ingredient','Other'];
  const sorted   = [...catOrder, ...Object.keys(categories).filter(c => !catOrder.includes(c))];

  return sorted
    .filter(cat => categories[cat])
    .map(cat => `
      <div class="list-category-header">${cat}</div>
      ${categories[cat].map(item => renderItem(item, members)).join('')}`)
    .join('');
}

function renderItem(item, members) {
  const addedBy = members.find(m => m.id === item.added_by);
  return `
    <div class="list-item-row" data-item-id="${item.id}">
      <div class="list-item-check${item.is_ticked ? ' ticked' : ''}" data-check="${item.id}">
        ${item.is_ticked ? '✓' : ''}
      </div>
      <span class="list-item-text${item.is_ticked ? ' ticked' : ''}">${escHtml(item.text)}</span>
      ${addedBy ? `<span class="list-item-by" data-member="${addedBy.id.replace('member-','')}"
                        style="color:${addedBy.colour_hex};font-size:14px">${addedBy.icon}</span>` : ''}
      <button class="list-item-delete" data-delete="${item.id}" aria-label="Delete item">✕</button>
    </div>`;
}

function wireItems(listsContent, members, isGrocery, container) {
  // Tap to tick
  listsContent.querySelectorAll('[data-check]').forEach(el => {
    el.addEventListener('click', () => {
      const itemId = el.dataset.check;
      const item = DB.getListItems(activeListId).find(i => i.id === itemId);
      if (!item) return;
      DB.updateListItem(activeListId, itemId, { is_ticked: !item.is_ticked });
      refreshItems(listsContent, members, isGrocery);
      updateNavCounts(container);
    });
  });

  // Delete
  listsContent.querySelectorAll('[data-delete]').forEach(el => {
    el.addEventListener('click', () => {
      DB.deleteListItem(activeListId, el.dataset.delete);
      refreshItems(listsContent, members, isGrocery);
      updateNavCounts(container);
    });
  });
}

function refreshItems(listsContent, members, isGrocery) {
  const items = DB.getListItems(activeListId);
  const wrap  = listsContent.querySelector('#list-items-wrap');
  if (wrap) {
    wrap.innerHTML = renderItems(items, members, isGrocery);
    wireItems(listsContent, members, isGrocery, listsContent.closest('#screen-lists'));
  }
  // Update remaining count
  const remaining = DB.getListItems(activeListId).filter(i => !i.is_ticked).length;
  const headerSpan = listsContent.querySelector('.lists-content-header span');
  if (headerSpan) headerSpan.textContent = `${remaining} remaining`;
}

function updateNavCounts(container) {
  DB.getLists().forEach(list => {
    const navItem = container.querySelector(`.list-nav-item[data-list-id="${list.id}"] .list-nav-count`);
    if (navItem) {
      const remaining = DB.getListItems(list.id).filter(i => !i.is_ticked).length;
      navItem.textContent = remaining;
    }
  });
}

/* ── New List Modal ───────────────────────── */
function openNewListModal(container) {
  openModal('Create New List', `
    <div class="form-group">
      <label class="form-label">List Name</label>
      <input class="form-control" id="nl-name" type="text" placeholder="e.g. Holiday Packing" maxlength="100">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-control" id="nl-type">
          <option value="todo">To-Do</option>
          <option value="grocery">Grocery</option>
          <option value="packing">Packing</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Icon (emoji)</label>
        <input class="form-control" id="nl-icon" type="text" placeholder="📋" maxlength="4" style="font-size:24px;text-align:center">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" id="nl-cancel">Cancel</button>
      <button class="btn btn-primary" id="nl-save">Create</button>
    </div>
  `);

  document.getElementById('nl-cancel').addEventListener('click', closeModal);
  document.getElementById('nl-save').addEventListener('click', () => {
    const name = document.getElementById('nl-name').value.trim();
    if (!name) { alert('Please enter a list name.'); return; }
    const type = document.getElementById('nl-type').value;
    const icon = document.getElementById('nl-icon').value.trim() || '📋';
    const newList = DB.addList({
      id: uid(),
      family_id: 'naughton-family-001',
      name, list_type: type, icon, is_shared: true,
    });
    activeListId = newList.id;
    closeModal();
    renderLists(container);
  });
}
