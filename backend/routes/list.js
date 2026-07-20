// routes/list.js
const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/list - current shopping list, joined with ingredient info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ul.id, ul.quantity, ul.unit, ul.is_checked, ul.source, ul.added_at,
              i.id AS ingredient_id, i.name, i.category
       FROM user_lists ul
       JOIN ingredients i ON i.id = ul.ingredient_id
       ORDER BY ul.is_checked ASC, i.category, i.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

// POST /api/list - manually add an item
// body: { ingredient_id, quantity, unit }
router.post('/', async (req, res) => {
  const { ingredient_id, quantity = 1, unit } = req.body;
  if (!ingredient_id || !unit) {
    return res.status(400).json({ error: 'ingredient_id and unit are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO user_lists (ingredient_id, quantity, unit, source)
       VALUES ($1, $2, $3, 'manual') RETURNING *`,
      [ingredient_id, quantity, unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item to list' });
  }
});

// PATCH /api/list/:id - toggle checked, or update quantity/unit
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { is_checked, quantity, unit } = req.body;

  const fields = [];
  const values = [];
  let i = 1;

  if (is_checked !== undefined) { fields.push(`is_checked = $${i++}`); values.push(is_checked); }
  if (quantity !== undefined)   { fields.push(`quantity = $${i++}`);   values.push(quantity); }
  if (unit !== undefined)       { fields.push(`unit = $${i++}`);       values.push(unit); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE user_lists SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'List item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update list item' });
  }
});

// DELETE /api/list/:id - remove an item from the list
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM user_lists WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'List item not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete list item' });
  }
});

// DELETE /api/list - clear all checked items ("clear completed")
router.delete('/', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM user_lists WHERE is_checked = TRUE RETURNING id');
    res.json({ deleted_count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear checked items' });
  }
});

module.exports = router;
