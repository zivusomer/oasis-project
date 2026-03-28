# README

Node.js API built with TypeScript, Express, and Gulp. Uses a middleware pattern for all API routes.

## Documentation

- Product and architecture design notes: `docs/APP_DESIGN.md`

## Compile and run

| Command | Description |
|--------|-------------|
| `gulp` or `npm run gulp` | Compile TypeScript (clean + build from `src/` to `dist/`) |
| `npm start` | Compile with Gulp, then start the server |
| `npm run dev` | Run with ts-node and auto-restart on file changes (no Gulp) |
| `npm run build` | Compile only (no clean) |
| `npm run clean` | Remove `dist/` only |
| `npm test` | Run API tests (Node test runner + supertest) |
| `npm run frontend:dev` | Run React frontend (Vite) |
| `npm run frontend:build` | Build React frontend |
| `npm run frontend:preview` | Preview built React frontend |
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

## Frontend (React)

React UI lives under `frontend/` and implements:
- Jira login (`POST /auth/login`)
- create NHI finding ticket (`POST /tickets`)
- recent tickets view (`GET /tickets/recent`) with clickable Jira links
- in-UI token handling: token is received on login and then sent automatically as `Authorization: Bearer <token>` for ticket APIs

Install frontend deps once:

`npm --prefix frontend install`

Run backend + frontend:

1. `npm run dev`
2. `npm run frontend:dev`

Vite proxies `/auth` and `/tickets` to `http://localhost:3000` in development.

Open the frontend in browser at:

- [http://localhost:5173](http://localhost:5173)

See final result in:
https://zivusomer.atlassian.net/jira/software/projects/KAN/boards/2

### Jira API token reminder

Create Jira API token in Atlassian account security page:

- [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

### Token behavior in this app

- Login endpoint returns the app token in response body.
- Frontend stores that token in local component state and sends it automatically in `Authorization` headers for `POST /tickets` and `GET /tickets/recent`.
- There is no explicit backend token revocation endpoint in current stateless design.
- To invalidate immediately in practice:
  - rotate/change `AUTH_TOKEN_SECRET` server-side (invalidates all issued app tokens), or
  - wait for token TTL expiration, or
  - revoke Jira API token in Atlassian settings (blocks future Jira access).

## Future improvements

1. In-memory cache for GET /tickets that will be invalidated upon POST /tickets request.