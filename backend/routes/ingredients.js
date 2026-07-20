// routes/ingredients.js
const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/ingredients - full catalog, optionally filtered by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const result = category
      ? await pool.query('SELECT * FROM ingredients WHERE category = $1 ORDER BY name', [category])
      : await pool.query('SELECT * FROM ingredients ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

// POST /api/ingredients - add a new ingredient to the catalog
router.post('/', async (req, res) => {
  const { name, unit = 'unit', category = 'other' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO ingredients (name, unit, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET unit = EXCLUDED.unit
       RETURNING *`,
      [name, unit, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create ingredient' });
  }
});

module.exports = router;
