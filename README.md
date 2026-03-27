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