const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app').default;

describe('Auth flow', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
    process.env.AUTH_TOKEN_SECRET = '12345678901234567890123456789012';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POST /auth/login returns 200 with token for valid Jira credentials', async () => {
    global.fetch = async () =>
      ({
        ok: true,
        status: 200,
      }) as Response;

    const res = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.tokenType, 'Bearer');
    assert.strictEqual(typeof res.body.token, 'string');
    assert.ok(res.body.token.length > 0);
    assert.strictEqual(typeof res.body.expiresInSeconds, 'number');
  });

  it('POST /auth/login returns 401 for invalid Jira credentials', async () => {
    global.fetch = async () =>
      ({
        ok: false,
        status: 401,
      }) as Response;

    const res = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'invalid-token',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_JIRA_CREDENTIALS');
  });

  it('POST /tickets returns 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/tickets').send({
      projectKey: 'SEC',
      title: 'Test finding',
      description: 'Missing auth header should fail',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'MISSING_AUTH_HEADER');
  });

  it('POST /tickets returns 200 when using valid token from /auth/login', async () => {
    global.fetch = async () =>
      ({
        ok: true,
        status: 200,
      }) as Response;

    const loginRes = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });

    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(typeof loginRes.body.token, 'string');

    const ticketsRes = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({
        projectKey: 'SEC',
        title: 'Test finding',
        description: 'Should pass with valid token',
      });

    assert.strictEqual(ticketsRes.status, 200);
    assert.match(ticketsRes.body.message, /createTicket handler placeholder/);
  });
});
