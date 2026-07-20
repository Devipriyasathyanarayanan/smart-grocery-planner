// server.js
// Application Tier entry point.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const ingredientsRouter = require('./routes/ingredients');
const recipesRouter = require('./routes/recipes');
const listRouter = require('./routes/list');

const app = express();
const PORT = process.env.PORT || 4000;

// Frontend is a separate container/origin now, so CORS is required.
// Restrict via FRONTEND_ORIGIN in production; '*' is fine for local dev.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

// API routes (this service is API-only — no static file serving)
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/list', listRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// app.listen(PORT, () => {
//   console.log(`Smart Grocery Planner running at http://localhost:${PORT}`);
// });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Grocery Planner running on port ${PORT}`);
});