# Smart Grocery List & Recipe Planner

A three-tier app, laid out as three independent top-level folders so each
can be containerized on its own later:

```
smart-grocery-planner/
├── frontend/     # Presentation Tier — static HTML/CSS/JS, no build step
├── backend/      # Application Tier — Node.js/Express API
└── database/     # Data Tier — PostgreSQL schema + seed data
```

Planning a recipe automatically adds whatever ingredients you're missing
to your shopping list — that's the core logic, in `backend/routes/recipes.js`.

## Run it locally (no Docker yet)

### 1. Database
Create the database and load the schema + sample data:
```bash
createdb grocery_planner
cd backend
cp .env.example .env    # fill in your Postgres credentials
npm install
npm run db:init          # applies database/01-schema.sql and 02-seed.sql
```

### 2. Backend
```bash
cd backend
npm start                 # runs on http://localhost:4000
```

### 3. Frontend
The frontend is plain static files — serve them any way you like:
```bash
cd frontend
npx serve .               # or: python3 -m http.server 5173
```
Open the page and it talks to `http://localhost:4000/api` by default.
To point it at a different backend, load it with `?api=http://host:4000/api`.

## Folder details

### `database/`
- `01-schema.sql` — creates `ingredients`, `recipes`, `recipe_ingredients`
  (join table), and `user_lists` (the shopping list)
- `02-seed.sql` — three sample recipes with their ingredients

Files are numbered because the **official `postgres` Docker image
auto-runs every `.sql` file in `/docker-entrypoint-initdb.d/` in
alphabetical order** on first container start. When you containerize,
mount this whole folder there and you don't need any init script at all.

### `backend/`
Express API, API-only (it does not serve the frontend). Key files:
- `server.js` — app entry point, CORS + JSON middleware, route mounting
- `routes/recipes.js` — includes `POST /recipes/:id/plan`, the core
  business logic that syncs recipe ingredients into the shopping list
- `routes/list.js`, `routes/ingredients.js` — CRUD for the list and catalog
- `db/pool.js` — PostgreSQL connection pool, configured entirely from
  environment variables (so it's container/K8s-secret friendly)
- `db/init.js` — convenience script for **local** dev only; not needed
  once the database container handles its own init

### `frontend/`
Plain HTML/CSS/JS, no bundler, no framework. `app.js` calls the backend
via a configurable `API` base URL (env-style override via `?api=` query
param or a `window.API_BASE` global) instead of assuming same-origin —
this is what lets it live in its own container/nginx image and still
reach a backend running elsewhere.

## API reference

| Method | Endpoint                  | Description                                   |
|--------|----------------------------|------------------------------------------------|
| GET    | `/api/ingredients`         | List ingredient catalog                        |
| POST   | `/api/ingredients`         | Add/upsert an ingredient                        |
| GET    | `/api/recipes`             | List all recipes                                |
| GET    | `/api/recipes/:id`         | Recipe detail with ingredients                  |
| POST   | `/api/recipes`             | Create a recipe with its ingredient list        |
| POST   | `/api/recipes/:id/plan`    | **Auto-add recipe's ingredients to the list**   |
| GET    | `/api/list`                | Current shopping list                           |
| POST   | `/api/list`                | Manually add an item                            |
| PATCH  | `/api/list/:id`            | Toggle checked / update quantity or unit        |
| DELETE | `/api/list/:id`            | Remove one item                                 |
| DELETE | `/api/list`                | Clear all checked items                         |

## Using MySQL instead of PostgreSQL

`database/01-schema.sql` is PostgreSQL syntax. To switch:
- `SERIAL` → `INT AUTO_INCREMENT`, `NOW()` → `CURRENT_TIMESTAMP`
- Swap `backend/db/pool.js` to use `mysql2/promise` instead of `pg`
- Change `$1, $2...` placeholders in `backend/routes/*.js` to `?`

## Next step: containerizing

This split (frontend / backend / database as separate folders) maps
directly onto three containers/services:
- `database/` → mount into the official `postgres` image's
  `/docker-entrypoint-initdb.d/`
- `backend/` → its own `Dockerfile` (Node base image, `npm install`, `npm start`)
- `frontend/` → its own `Dockerfile` (e.g. nginx serving static files)

Say the word when you're ready and I'll write the Dockerfiles and a
`docker-compose.yml` (and later, Kubernetes manifests) to wire the three
together.
