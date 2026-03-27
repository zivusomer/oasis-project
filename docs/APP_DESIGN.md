# App Design Notes

This document is the single source of truth for product/design considerations that are not part of development setup.

## Purpose

- Capture requirements, constraints, and decisions as they evolve.
- Keep `README.md` focused on local development and codebase usage.

## Current Product Goal

Build a multi-user application that integrates with Jira so each signed-in user can securely connect and use their own Jira workspace.

### In Scope

- User authentication for this app.
- Jira account/workspace connection flow.
- Secure token handling and user-to-workspace mapping.

### Out of Scope

- Billing/plan management.
- Advanced role/permission systems.
- Deep analytics/reporting.

## Design Considerations

### Authentication

#### Decision Summary

- Chosen approach for assignment MVP: stateless backend authentication using Jira email + Jira API token.
- User first creates a Jira API token in Atlassian settings.
- User authenticates directly against Jira via our backend (`/auth/login` pre-flight call to Jira `/rest/api/3/myself`).
- On successful validation, backend issues a short-lived, signed token that encapsulates Jira credentials for follow-up requests.
- Backend remains stateless: no server-side session store and no user database for auth state in this phase.
- Jira OAuth 2.0 remains the long-term production path; API-token flow is selected now for speed, simplicity, and reviewability.

#### Final Flow Summary (Project Key Passed Per Request)

0. **User preparation (external)**  
   User creates a Jira API token in Atlassian settings. This is done in https://id.atlassian.com/manage-profile/security/api-tokens.
   I created a 1y Jira API token, which should be used by client (i.e. Postman requests here) in the request body. I kept the JIRA_BASE_URL in the local .zshrc file. These should be used for the /auth/login API.

1. **Authentication and token exchange (`POST /auth/login`)**  
   Request includes `email` and `jiraApiToken` in its body.
   Backend validates via Jira `GET /rest/api/3/myself`, then issues a signed/encrypted app token.

2. **Create finding ticket (`POST /tickets`)**  
   Request includes Bearer token and payload with `projectKey`, `title`, and `description`.  
   Backend extracts Jira credentials from app token, creates issue in Jira, and force-adds app label (for example `identityhub-finding`).

3. **Fetch recent tickets (`GET /tickets/recent`)**  
   Request includes Bearer token and `projectKey` as query param.  
   Backend runs JQL in Jira and returns top 10:
   `project = "{projectKey}" AND labels = "identityhub-finding" ORDER BY created DESC`.

4. **Logout (stateless)**  
   Client deletes/stops sending app token; server keeps no auth session state.

**Why this shape was chosen**
- No separate "set current project" endpoint is required.
- Same user can target different Jira projects across calls.
- Backend stays stateless because request context carries both auth and project scope.

#### Main Dilemmas Discussed

- **OAuth 2.0 vs API token**: OAuth is more production-grade but heavier to configure for an assignment; API token is faster and frictionless.
- **Stateful vs stateless backend**: stateful sessions/DB improve revocation and lifecycle control; stateless reduces setup and operational complexity.
- **Where to keep Jira credentials**: storing credentials server-side is safer for revocation/control; self-contained token is simpler but needs strict security controls.
- **How to support recent tickets without DB**: use Jira-side metadata (label) + JQL query instead of local persistence.
- **Simplicity vs heavier recent-ticket fetch**: stateless design keeps implementation simple, but `GET /tickets/recent` will be heavier because each call depends on Jira search/JQL work instead of a local cached or persisted history table.
- **Logout semantics**: app logout is client-side token deletion; Jira API tokens cannot be revoked programmatically by a normal integration.

#### Agreed Backend-First Flow (No Frontend Assumptions)

0. **User prep in Jira**  
   User creates a Jira API token in Atlassian account settings and knows the target Jira project key.

1. **Login exchange (`POST /auth/login`)**  
   Input: `email`, `jiraApiToken`.  
   Backend validates credentials by calling Jira `GET /rest/api/3/myself` with Basic Auth (`base64(email:token)`).

2. **Token issuance**  
   If validation succeeds, backend returns a short-lived signed token (and encrypted credential payload) to be used in later requests.

3. **Create ticket (`POST /tickets`)**  
   Input: Bearer token + payload including `projectKey`, `title`, `description`.  
   Backend extracts credentials from token, calls Jira issue creation API, and adds a fixed app label (for example `identityhub-finding`).

4. **Recent tickets (`GET /tickets/recent`)**  
   Input: Bearer token + `projectKey` query param.  
   Backend queries Jira with JQL using the app label and returns latest 10:
   `project = "{projectKey}" AND labels = "identityhub-finding" ORDER BY created DESC`.

5. **Logout**  
   Stateless logout = client stops sending/deletes app token.  
   Full Jira credential revocation must be done by user in Atlassian token settings.

#### Security Requirements For This Choice

- HTTPS/TLS is mandatory for all endpoints.
- Use short token expiration to reduce replay window.
- Sign tokens with strong server secret; do not commit secrets.
- Encrypt sensitive credential payload (not only sign).
- Never log raw Jira API tokens.
- If cookie-based delivery is used later: `HttpOnly`, `Secure`, and strict `SameSite`.

### Error handler
- Added a general error handler to catch errors that our thrown explicitly, as well as internal errors that aren't handled properly.

## Architecture Updates (Latest)

This section captures implementation and structure changes completed after the original authentication-flow decision notes.

### High-Level Backend Shape

- The backend now follows a class-based, dependency-injected architecture end-to-end (container + route/controller/service split).
- `AppContainer` acts as the composition root and wires singleton-like instances once on startup.
- `ApplicationRunner` owns startup lifecycle and process-level crash guards.
- Constants were extracted from mixed files into domain-specific constants files.

### Auth and Token Handling

- `AuthService` validates Jira credentials and issues/verifies the app auth token.
- `jose` loading was extracted out of `AuthService` into an injectable `JoseProvider` to separate module-loading concerns from auth domain logic.
- Auth request-context extraction (`req.authUser`) moved out of `TicketsController` into dedicated middleware helper `AuthRequestContext`.
- Auth middleware files are grouped under `src/middleware/auth`.

### Ticket Domain Refactor

- Ticket logic was split out of controller-level implementation into dedicated services:
  - `CreateTicketService`
  - `RecentTicketsService`
- Shared Jira-related concerns were extracted into `JiraGateway`:
  - Jira base URL resolution
  - Basic auth construction
  - project key validation
  - Jira credential failure mapping
  - Jira error payload parsing
- `TicketsController` now focuses on request validation and delegating to services.

### HTTP Access Abstraction

- Direct `fetch` calls were centralized behind `HttpServer`.
- `AuthService`, `JiraGateway`, `CreateTicketService`, and `RecentTicketsService` use this shared HTTP abstraction.
- This creates a single place to add cross-cutting HTTP behavior later (timeouts, retries, tracing, metrics).

### Middleware and Error Handling Structure

- Error-related middleware was moved into a dedicated subdirectory:
  - `src/middleware/errorHandlers/AppHttpError.ts`
  - `src/middleware/errorHandlers/appErrorHandler.ts`
  - `src/middleware/errorHandlers/createHttpError.ts`
  - `src/middleware/errorHandlers/errorHandler.ts`
- The old module-level binding pattern was removed; singleton exposure is encapsulated inside `AppErrorHandler` static methods.
- Auth middleware is now grouped in:
  - `src/middleware/auth/authGuard.ts`
  - `src/middleware/auth/authRequestContext.ts`

### Testing and Validation Status

- Test suite was split by API surface and expanded:
  - `auth.login` coverage
  - `tickets.create` coverage (including missing/invalid auth header scenarios)
  - `tickets.recent` coverage (including label filtering behavior)
- Dedicated `errorHandlers` test suite now covers:
  - factory creation (`createHttpError`)
  - production masking for 5xx
  - non-production stack behavior
  - fallback conversion for generic errors
  - dynamic status/code/details propagation
  - invalid status fallback to 500
- Build/lint/tests are passing after these refactors.

### E2E Operations Flow

Done manually in this order in Postman requests committed to this project:
  1. `POST /auth/login`
  2. token update into Postman Development environment `authToken`
  3. `POST /tickets`
  4. `GET /tickets/recent`

## Frontend Stage (React UI)

This stage adds a browser UI on top of the existing stateless backend flow.

### Scope Implemented

- Login screen that calls `POST /auth/login` with:
  - Jira email
  - Jira API token
- NHI finding creation form:
  - project key input (user writes/selects key)
  - title (summary)
  - description
  - submits to `POST /tickets`
- Recent tickets view:
  - calls `GET /tickets/recent?projectKey=...`
  - shows ticket title and creation timestamp
  - each item opens Jira issue URL in a new tab

### Frontend Token Handling

- Backend app token is returned by `/auth/login` response body.
- Frontend stores this token in runtime state and automatically attaches it as Bearer auth for ticket APIs.
- UI does not ask user to re-enter token manually for each request.
- If login does not succeed, token is not set and ticket requests will fail with auth errors.

### Validation Expectations in UI

- Basic required-field validation exists on forms (browser + component checks).
- Backend remains source of truth for business/security validation:
  - missing/invalid auth header
  - invalid Jira credentials
  - invalid project key
  - payload validation and downstream Jira errors
- UI surfaces backend error payload messages.

### Token Invalidation Semantics (Current Design)

- Current architecture is stateless and does not include a dedicated revoke/logout API.
- Effective invalidation paths:
  - app token expiry (TTL)
  - changing server `AUTH_TOKEN_SECRET` (global invalidation)
  - revoking Jira API token in Atlassian (Jira operations stop succeeding)

### Frontend Runtime

- Frontend stack: React + Vite in `frontend/`.
- Local dev URL is `http://localhost:5173`.
- Vite proxies `/auth` and `/tickets` to backend `http://localhost:3000` in development.
