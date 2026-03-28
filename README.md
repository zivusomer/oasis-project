# README

Node.js API built with TypeScript, Express, and Gulp. Uses a middleware pattern for all API routes.
Product and architecture design notes: `docs/APP_DESIGN.md`

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



### E2E Operations Flow

Postman requests in the postman directory of this repository can be used for the pure backend flow.

Done manually in this order in Postman requests committed to this project:
  1. `POST /auth/login`
  2. token update into Postman Development environment `authToken`
  3. `POST /tickets`
  4. `GET /tickets/recent`