// public/app.js
// Presentation Tier logic: talks to the Node/Express API only via fetch.
// No frameworks — plain DOM manipulation.

// Backend now runs as a separate service/container, so the frontend needs
// a full URL, not a same-origin relative path. Override by loading this
// page with ?api=http://your-backend:4000/api, or just edit the default
// below once you know your backend's address.
const params = new URLSearchParams(window.location.search);
const API = params.get('api') || window.API_BASE || 'http://localhost:4000/api';


// const API = params.get('api') || window.API_BASE || 'http://planner-backend/api'; //   /api/   http://planner-backend:4000/ingredients

// ---------- Tab switching ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---------- Toast helper ----------
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

// ---------- Shopping list ----------
async function loadList() {
  const res = await fetch(`${API}/list`);
  const items = await res.json();
  const listEl = document.getElementById('shoppingList');
  const emptyState = document.getElementById('listEmptyState');
  listEl.innerHTML = '';

  if (items.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'list-item' + (item.is_checked ? ' checked' : '');

    const sourceLabel = item.source && item.source.startsWith('recipe:')
      ? item.source.replace('recipe:', '')
      : null;

    li.innerHTML = `
      <input type="checkbox" class="item-checkbox" ${item.is_checked ? 'checked' : ''} />
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">${item.category}${sourceLabel ? `<span class="item-source-tag">from ${sourceLabel}</span>` : ''}</div>
      </div>
      <div class="item-qty">${formatQty(item.quantity)} ${item.unit}</div>
      <button class="item-delete" title="Remove">&times;</button>
    `;

    li.querySelector('.item-checkbox').addEventListener('change', async (e) => {
      await fetch(`${API}/list/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_checked: e.target.checked }),
      });
      loadList();
    });

    li.querySelector('.item-delete').addEventListener('click', async () => {
      await fetch(`${API}/list/${item.id}`, { method: 'DELETE' });
      loadList();
    });

    listEl.appendChild(li);
  }
}

function formatQty(q) {
  const n = Number(q);
  return Number.isInteger(n) ? n : n.toFixed(1);
}

document.getElementById('clearCheckedBtn').addEventListener('click', async () => {
  const res = await fetch(`${API}/list`, { method: 'DELETE' });
  const data = await res.json();
  showToast(`Cleared ${data.deleted_count} checked item(s)`);
  loadList();
});

// ---------- Add item manually ----------
async function loadIngredientOptions() {
  const res = await fetch(`${API}/ingredients`);
  const ingredients = await res.json();
  const select = document.getElementById('ingredientSelect');
  select.innerHTML = ingredients
    .map((i) => `<option value="${i.id}" data-unit="${i.unit}">${i.name}</option>`)
    .join('');

  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    document.getElementById('itemUnit').value = opt.dataset.unit || '';
  });
  if (select.options.length) select.dispatchEvent(new Event('change'));
}

document.getElementById('addItemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ingredient_id = document.getElementById('ingredientSelect').value;
  const quantity = document.getElementById('itemQuantity').value;
  const unit = document.getElementById('itemUnit').value;

  await fetch(`${API}/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient_id, quantity, unit }),
  });
  showToast('Added to list');
  loadList();
});

// ---------- Recipes ----------
async function loadRecipes() {
  const res = await fetch(`${API}/recipes`);
  const recipes = await res.json();
  const grid = document.getElementById('recipeGrid');
  grid.innerHTML = '';

  for (const recipe of recipes) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <h3>${recipe.name}</h3>
      <p>${recipe.description || ''}</p>
      <span class="servings">Serves ${recipe.servings}</span>
    `;
    card.addEventListener('click', () => openRecipeModal(recipe.id));
    grid.appendChild(card);
  }
}

async function openRecipeModal(id) {
  const res = await fetch(`${API}/recipes/${id}`);
  const recipe = await res.json();

  document.getElementById('modalRecipeName').textContent = recipe.name;
  document.getElementById('modalRecipeDesc').textContent = recipe.description || '';
  document.getElementById('modalInstructions').textContent = recipe.instructions || '';

  const ingList = document.getElementById('modalIngredientList');
  ingList.innerHTML = recipe.ingredients
    .map((i) => `<li><span>${i.name}</span><span>${formatQty(i.quantity)} ${i.unit}</span></li>`)
    .join('');

  const planResult = document.getElementById('planResult');
  planResult.hidden = true;

  const planBtn = document.getElementById('planRecipeBtn');
  planBtn.onclick = async () => {
    planBtn.disabled = true;
    planBtn.textContent = 'Adding...';
    try {
      const planRes = await fetch(`${API}/recipes/${id}/plan`, { method: 'POST' });
      const result = await planRes.json();
      planResult.hidden = false;
      planResult.textContent =
        `Added ${result.summary.added} new item(s), topped up ${result.summary.topped_up}, ` +
        `${result.summary.already_sufficient} already on your list.`;
      loadList();
    } finally {
      planBtn.disabled = false;
      planBtn.textContent = 'Add ingredients to shopping list';
    }
  };

  document.getElementById('recipeModal').hidden = false;
}

document.getElementById('closeModalBtn').addEventListener('click', () => {
  document.getElementById('recipeModal').hidden = true;
});
document.getElementById('recipeModal').addEventListener('click', (e) => {
  if (e.target.id === 'recipeModal') e.target.hidden = true;
});

// ---------- Init ----------
loadIngredientOptions();
loadList();
loadRecipes();
