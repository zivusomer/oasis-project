# Deploying to AWS

This doc describes how this application is deployed on AWS and how to connect it to a cloud database.

## 1. Current deployment: AWS App Runner

The app is deployed on **AWS App Runner**, connected to the GitHub repo for this codebase. Every push to the default branch (e.g. `main` or `master`) triggers an automatic build and deployment.

### How to open the service

- **Region:** eu-west-3 (Paris)
- **Console:** AWS Console → **App Runner** → **Services** → **PlaygroundService**
- **Direct link:** [App Runner – PlaygroundService (eu-west-3)](https://eu-west-3.console.aws.amazon.com/apprunner/home?region=eu-west-3#/services/dashboard?service_arn=arn%3Aaws%3Aapprunner%3Aeu-west-3%3A732304102656%3Aservice%2FPlaygroundService%2Fbd3bb3ae72b64ed0acfa6bb39d621db1&active_tab=logs)

From the service page you can view the **Service URL**, **Logs**, **Metrics**, and **Configuration**.

### Automatic deployment process

1. **Source:** The App Runner service is linked to this repository and the branch you configured (e.g. `main` or `master`).
2. **Trigger:** Pushing to that branch starts a new deployment. App Runner pulls the code, runs the build, and deploys the new version.
3. **Build:** Configure the build command (e.g. `npm install` and `npm run gulp` or `gulp`) so that `dist/` is produced.
4. **Start:** Set the start command to `npm start` or `node dist/index.js`. App Runner sets `PORT`; the app already uses `process.env.PORT || 3000`.
5. **Result:** The **Service URL** serves the latest code after each successful deployment. No separate CI pipeline is required.

### Environment variables

Add environment variables (e.g. `DATABASE_URL`, `NODE_ENV`) in the App Runner service **Configuration** so the running app can read them via `process.env`. Use this for DB connection strings and secrets (or reference AWS Secrets Manager if needed).

---

## 2. Other hosting options (alternatives)

If you ever move off App Runner, these are common alternatives:

| Option | Best for | Notes |
|--------|----------|--------|
| **EC2** | Full control, any OS | Install Node, run `npm start` (e.g. with PM2). Optionally put Nginx in front. |
| **Elastic Beanstalk** | Easiest “just run my app” | Connect GitHub or upload the app; EB handles Node runtime, load balancer, and scaling. |
| **ECS (Fargate)** | Containers, scale to zero | Build a Docker image, run it as a Fargate service. |
| **Lambda + API Gateway** | Serverless, pay per request | Requires adapting the app to Lambda handlers (e.g. serverless-express). |

**Deployable artifact:** Build locally with `gulp` (or `npm start` once); deploy **`dist/`**, **`package.json`**, and run `npm install --production` on the host (or ship `node_modules`). Set **`PORT`** in the environment as required by the platform.

---

## 3. Database on AWS

To persist data (e.g. users) across restarts and instances, use a managed database in AWS:

| Option | Type | Notes |
|--------|------|--------|
| **RDS** (PostgreSQL, MySQL, etc.) | Relational | Create a DB instance; connect from the app with a client (e.g. `pg`, `mysql2`). Use a connection string in an env var. |
| **DynamoDB** | NoSQL key-value | Create a table; use the AWS SDK in the app. No connection string; use IAM or access keys. |

**Security:** Prefer running the app and DB in the same VPC. For RDS, restrict the security group to the app. Store DB credentials in **environment variables** or **AWS Secrets Manager**, not in code.

---

## 4. Integrating a DB with this app

- **Connection config:** Read from the environment (e.g. `process.env.DATABASE_URL` for RDS, or `AWS_REGION` and credentials for DynamoDB). Use a small module that builds the client or connection from `process.env`.
- **Users API:** Replace the in-memory `Map` in `src/routes/users.ts` with DB calls (e.g. RDS with `pg` or DynamoDB with `@aws-sdk/client-dynamodb`). Keep the same route shapes so existing clients (e.g. Postman) keep working.
- **Startup:** In `src/startup.ts`, open or verify the DB connection when the server boots; on failure, call `next(err)` or `process.exit(1)` so the app does not run without a DB.
- **App Runner:** Add the DB URL (or region/credentials) as environment variables in the App Runner service **Configuration**, then trigger a new deployment or let the next push deploy the change.
