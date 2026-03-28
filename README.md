# Oasis Project

Backend API (TypeScript/Express) + Frontend UI (React/Vite) for Jira NHI finding tickets.
Design and architecture notes: `docs/APP_DESIGN.md`

## Installations Required

- Node.js 18+ (20+ recommended)
- npm (bundled with Node)
- Postman desktop app (for backend-only manual flow)

## Setup

1. From repo root:
   - `npm install`
   - `npm --prefix frontend install`

2. Create a one-time Jira API token in Atlassian settings: https://id.atlassian.com/manage-profile/security/api-tokens.

3. Set backend env vars in a local shell file (for example `~/.zshrc`) and keep them out of git.
   - `JIRA_BASE_URL` (example: `https://your-domain.atlassian.net`)
   - `AUTH_TOKEN_SECRET` (minimum 32 chars)

## Backend execution (locally)

1. `npm start`
2. Call server at `http://localhost:3000` (using the Postman info and flow described below).

### Postman Info

Postman files in this repo:

- collection: `postman/collections/oasisAPIs`
- environments: `postman/environments/Development.yaml`, `postman/environments/Production.yaml`

Development environment values:

- `baseURL` = `http://localhost:3000`
- `jiraEmail` = your Jira email
- `jiraApiToken` = your Jira API token
- `authToken` = token from login response

Manual backend flow order:

1. `POST /auth/login`
2. Copy `token` into `authToken`
3. `POST /tickets`
4. `GET /tickets/recent?projectKey=...`

## E2E With Frontend (locally)

1. Start backend:
   - `npm start`
2. Start frontend:
   - `npm run frontend:dev`
3. Open in browser and enter API token from setup:
   - [http://localhost:5173](http://localhost:5173)

Frontend behavior:

- Login form calls `POST /auth/login`
- Token from login response is stored in UI state
- `POST /tickets` and `GET /tickets/recent` automatically send `Authorization: Bearer <token>`
- If login fails, no token is set and protected calls fail as expected