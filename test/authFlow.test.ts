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

  it('POST /tickets returns 201 when using valid token from /auth/login', async () => {
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/api/3/myself')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
        } as Response;
      }

      if (url.endsWith('/rest/api/3/project/SEC') && init?.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ key: 'SEC' }),
          text: async () => '',
          headers: { get: () => 'application/json' },
        } as unknown as Response;
      }

      if (url.endsWith('/rest/api/3/issue') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: '10001',
            key: 'SEC-101',
            self: 'https://jira.example/issue/10001',
          }),
          text: async () => '',
        } as Response;
      }

      return {
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => '',
      } as Response;
    };

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

    assert.strictEqual(ticketsRes.status, 201);
    assert.strictEqual(ticketsRes.body.issueKey, 'SEC-101');
    assert.strictEqual(ticketsRes.body.issueUrl, 'https://example.atlassian.net/browse/SEC-101');
  });

  it('POST /tickets returns 400 for invalid Jira project key', async () => {
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/api/3/myself')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
        } as Response;
      }

      if (url.endsWith('/rest/api/3/project/INVALID') && init?.method === 'GET') {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
          text: async () => '',
        } as Response;
      }

      return {
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => '',
      } as Response;
    };

    const loginRes = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });

    assert.strictEqual(loginRes.status, 200);

    const ticketsRes = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({
        projectKey: 'INVALID',
        title: 'Test finding',
        description: 'Should fail for invalid project key',
      });

    assert.strictEqual(ticketsRes.status, 400);
    assert.strictEqual(ticketsRes.body.code, 'INVALID_PROJECT_KEY');
  });
});
