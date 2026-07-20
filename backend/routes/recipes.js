// routes/recipes.js
const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/recipes - list all recipes (summary only)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, servings FROM recipes ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// GET /api/recipes/:id - full recipe detail with its ingredient list
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const recipeResult = await pool.query('SELECT * FROM recipes WHERE id = $1', [id]);
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const ingredientsResult = await pool.query(
      `SELECT i.id, i.name, i.category, ri.quantity, ri.unit
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1
       ORDER BY i.name`,
      [id]
    );

    res.json({ ...recipeResult.rows[0], ingredients: ingredientsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// POST /api/recipes - create a recipe with its ingredient list in one call
// body: { name, description, servings, instructions,
//         ingredients: [{ ingredient_id, quantity, unit }, ...] }
router.post('/', async (req, res) => {
  const { name, description = '', servings = 4, instructions = '', ingredients = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recipeResult = await client.query(
      `INSERT INTO recipes (name, description, servings, instructions)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, servings, instructions]
    );
    const recipe = recipeResult.rows[0];

    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES ($1, $2, $3, $4)`,
        [recipe.id, ing.ingredient_id, ing.quantity, ing.unit]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(recipe);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create recipe' });
  } finally {
    client.release();
  }
});

// POST /api/recipes/:id/plan  <-- THE CORE BUSINESS LOGIC
// "Plan" a recipe: for every ingredient it needs, make sure the
// shopping list has enough. If an ingredient is already on the list
// (unchecked), top up its quantity. If it's missing, add a new row.
// Nothing is duplicated, and items already in the pantry (checked off)
// are left alone unless still insufficient.
router.post('/:id/plan', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const recipeResult = await client.query('SELECT * FROM recipes WHERE id = $1', [id]);
    if (recipeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    const recipe = recipeResult.rows[0];

    const neededResult = await client.query(
      `SELECT ri.ingredient_id, ri.quantity, ri.unit, i.name
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1`,
      [id]
    );

    const added = [];
    const topped_up = [];
    const already_sufficient = [];

    for (const need of neededResult.rows) {
      // Look for an existing UNCHECKED list entry for this ingredient
      const existing = await client.query(
        `SELECT * FROM user_lists WHERE ingredient_id = $1 AND is_checked = FALSE
         ORDER BY added_at ASC LIMIT 1`,
        [need.ingredient_id]
      );

      if (existing.rows.length === 0) {
        // Not on the list at all -> add it
        const inserted = await client.query(
          `INSERT INTO user_lists (ingredient_id, quantity, unit, source)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [need.ingredient_id, need.quantity, need.unit, `recipe:${recipe.name}`]
        );
        added.push({ name: need.name, ...inserted.rows[0] });
      } else {
        const row = existing.rows[0];
        if (Number(row.quantity) >= Number(need.quantity)) {
          // Already have enough queued up
          already_sufficient.push({ name: need.name, ...row });
        } else {
          // On the list, but not enough quantity -> top it up
          const updated = await client.query(
            `UPDATE user_lists SET quantity = $1, source = $2 WHERE id = $3 RETURNING *`,
            [need.quantity, `recipe:${recipe.name}`, row.id]
          );
          topped_up.push({ name: need.name, ...updated.rows[0] });
        }
      }
    }

    await client.query('COMMIT');
    res.json({
      recipe: recipe.name,
      summary: {
        added: added.length,
        topped_up: topped_up.length,
        already_sufficient: already_sufficient.length,
      },
      added,
      topped_up,
      already_sufficient,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to plan recipe' });
  } finally {
    client.release();
  }
});

module.exports = router;
