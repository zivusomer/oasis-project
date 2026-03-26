# playground

Node.js API built with TypeScript, Express, and Gulp. Uses a middleware pattern for all API routes.

## Compile and run

| Command | Description |
|--------|-------------|
| `gulp` or `npm run gulp` | Compile TypeScript (clean + build from `src/` to `dist/`) |
| `npm start` | Compile with Gulp, then start the server |
| `npm run dev` | Run with ts-node and auto-restart on file changes (no Gulp) |
| `npm run build` | Compile only (no clean) |
| `npm run clean` | Remove `dist/` only |
| `npm test` | Run API tests (Node test runner + supertest) |
| `npm run lint` | Run ESLint (with `--fix`) and Prettier on `src` and `test` (lint + format) |

**Typical flow:** Run `gulp` to compile, then `npm start` to run the server. Or run `npm start` once (it compiles then starts).

**Debugging (breakpoints):** Breakpoints only hit when the app is running under the debugger, not when you start it with `npm start` in the terminal.

1. Stop the server if it’s running (`Ctrl+C`).
2. Set a breakpoint in your code (e.g. in `src/routes/helloWorld.ts`).
3. Press **F5** (or Run → Start Debugging) and choose **"Debug app (ts-node)"** so the app runs from TypeScript with the debugger attached.
4. Wait until the console shows the server is up (e.g. "Server running at http://localhost:3000").
5. In another terminal, send a request (e.g. `curl http://localhost:3000/hello-world`). Execution should stop on your breakpoint.

Alternatively: run `npm start` (which uses `--inspect`), then **Run → Start Debugging** and choose **"Attach to Node"** so the debugger attaches to the already-running process; then trigger the request.

Server listens on `http://localhost:3000` (or `PORT` env var).

- **`GET /`** – Welcome JSON with links to the APIs.
- **`GET /hello-world`** – `{"message":"Hello, World!"}`
- **`GET /echo`** – No body; responds with `{ "message": "GET request with no message posted, echo nothing" }`.
- **`POST /echo`** – Body JSON `{ "message": "<string>" }` – responds with the same `{ "message": "..." }`.

## Deployment (AWS App Runner)

This app is deployed on **AWS App Runner** and is wired to the GitHub repo for this codebase. The live service is updated automatically when you push to the default branch (`main`).

### How to open the App Runner service

1. Open the **AWS Console** and switch to region **eu-west-3** (Paris).
2. Go to **App Runner** (search for “App Runner” in the console or use **Services → App Runner**).
3. In the left sidebar, open **Services** and select **PlaygroundService** (or the service name you gave when creating it).

**Direct link to the service dashboard (eu-west-3):**  
[App Runner – PlaygroundService (eu-west-3)](https://eu-west-3.console.aws.amazon.com/apprunner/home?region=eu-west-3#/services/dashboard?service_arn=arn%3Aaws%3Aapprunner%3Aeu-west-3%3A732304102656%3Aservice%2FPlaygroundService%2Fbd3bb3ae72b64ed0acfa6bb39d621db1&active_tab=logs)

From the service page you can see the **Service URL**, **Logs**, **Metrics**, and **Configuration** (e.g. build and runtime settings, env vars).

### Automatic deployment

- **Source:** The App Runner service is connected to this repository. It uses the branch you configured (typically `main` or `master`).
- **Trigger:** A **push to that branch** starts a new deployment. App Runner runs the build (e.g. `npm install`, your build command) and then deploys the new version.
- **Build/runtime:** Configure the build command (e.g. `npm run gulp` or `gulp`) and start command (e.g. `npm start` or `node dist/index.js`) in the App Runner service configuration so the deployed app matches local behavior.
- **Result:** After a successful deployment, the **Service URL** serves the latest code. No separate CI server is required; App Runner handles build and deploy from GitHub.

For adding a cloud database (e.g. RDS or DynamoDB) and other AWS options, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Project structure

```
test/
└── helloWorld.test.ts  # Tests for APIs (supertest + node:test)
src/
├── index.ts          # Entry point: runs startup, then starts the server
├── app.ts            # Express app: middleware, route mounting, error handler
├── startup.ts        # Logic that runs once on server boot (e.g. DB connect)
├── api.ts            # createApi() – thin route helper (asyncHandler applied for you)
├── routes/
│   ├── index.ts      # Mounts shared middleware, GET / overview, and each API router
│   ├── helloWorld.ts # GET /hello-world
│   └── echo.ts       # GET /echo (no body) and POST /echo (echo JSON message)
└── middleware/
    ├── index.ts      # Exports shared middleware and types
    ├── requestLogger.ts
    ├── asyncHandler.ts
    └── errorHandler.ts  # Error middleware (next(err) → 500 JSON)
```

- **`index.ts`** – Do not put route or business logic here. Only startup + `app.listen`.
- **`app.ts`** – Global middleware (e.g. `express.json()`), mounting routes, and the final error-handling middleware.
- **`startup.ts`** – One-time boot steps (DB, migrations, config). Called before the server listens.
- **`routes/index.ts`** – Mounts shared middleware and each API’s router. One API per file under `routes/`.
- **`middleware/`** – Reusable middleware used by routes and app.

## Where to add new code

### New API (one file per API)

1. Add **`src/routes/myApi.ts`**. Use **`createApi()`** from `../api`: no `asyncHandler` or `Request`/`Response` types in the file—the last handler is wrapped automatically and errors go to the error middleware.

```ts
// src/routes/myApi.ts
import { createApi } from '../api';

const api = createApi();

api.get('/', (req, res, next) => res.json({ data: '...' }));

// Multiple middleware, then handler (same req, res, next signature):
// api.get('/protected', auth, validate(schema), (req, res, next) => res.json({ ... }));

export default api.router;
```

2. In **`src/routes/index.ts`**, import the router and mount it:

```ts
import myApi from './myApi';
// ...
router.use('/my-api', myApi);
```

Then `GET /my-api` is handled by `myApi.ts`. Use the **`(req, res, next)`** signature for every handler (and middleware); call `next()` to continue or `next(err)` to fail the request. Handlers can be sync or async.

### New middleware

1. Add a new file under **`src/middleware/`** (e.g. `src/middleware/myMiddleware.ts`).
2. Implement a function `(req, res, next) => { ... }` and call `next()` or `next(err)`.
3. Export it from **`src/middleware/index.ts`**.
4. Use it in **`src/routes/index.ts`**:
   - **All API routes:** `router.use(yourMiddleware)` before your route definitions.
   - **One route:** add it in the chain: `router.get('/path', yourMiddleware, asyncHandler(handler))`.

### Logic on server boot

Put it in **`src/startup.ts`** inside `runStartup()`. This runs once before the server starts listening. Use for DB connection, migrations, loading config, etc.

### Global app middleware

Add in **`src/app.ts`** before `mountRoutes(app)` (e.g. CORS, more parsers).

## Middleware pattern

Every middleware uses the **`(req, res, next)`** signature:

- **`next()`** — pass control to the next middleware or route handler in the chain.
- **`next(err)`** — skip the rest of the chain and go to the **error handler**; the API responds with an error (e.g. 500 JSON) and does not run any later middleware or the normal handler.

So: call `next()` to continue, call `next(err)` to fail the request and hit the error handler.

In this project:

- All API routes use the same **router** with **shared middleware** (e.g. `requestLogger`) via `router.use(...)`.
- Each route is a **chain** of middlewares ending in a handler. Async handlers are wrapped in **`asyncHandler`** so thrown errors and promise rejections are passed as `next(err)` to the error middleware.
- The **error middleware** in `app.ts` (the four-argument `(err, req, res, next)` function) catches those errors and returns a JSON error response.

**Linting & formatting:** `npm run lint` runs ESLint with `--fix` and Prettier on `src` and `test`. **Pre-commit:** Husky runs `lint-staged`, which runs Prettier and ESLint on staged `.ts` files (format then lint); fix any reported issues or the commit will be blocked.

Build: **Gulp** (see `gulpfile.js`). TypeScript options: **`tsconfig.json`**.
