const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app').default;

class FetchMockFactory {
  static getFetchUrl(input: unknown) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (input && typeof input === 'object' && 'url' in input) {
      return String(input.url || '');
    }
    return String(input);
  }

  static jsonResponse(status: number, payload: unknown) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  static emptyResponse(status: number) {
    return new Response('', { status });
  }
}

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
    global.fetch = async () => FetchMockFactory.emptyResponse(200);

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
    global.fetch = async () => FetchMockFactory.emptyResponse(401);

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
    global.fetch = async (input, init) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) {
        return FetchMockFactory.emptyResponse(200);
      }

      if (url.endsWith('/rest/api/3/project/SEC') && init?.method === 'GET') {
        return FetchMockFactory.jsonResponse(200, { key: 'SEC' });
      }

      if (url.endsWith('/rest/api/3/issue') && init?.method === 'POST') {
        return FetchMockFactory.jsonResponse(201, {
          id: '10001',
          key: 'SEC-101',
          self: 'https://jira.example/issue/10001',
        });
      }

      return FetchMockFactory.emptyResponse(500);
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
    global.fetch = async (input, init) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) {
        return FetchMockFactory.emptyResponse(200);
      }

      if (url.endsWith('/rest/api/3/project/INVALID') && init?.method === 'GET') {
        return FetchMockFactory.emptyResponse(404);
      }

      return FetchMockFactory.emptyResponse(500);
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

  it('GET /tickets/recent returns 200 with recent issues when authenticated', async () => {
    global.fetch = async (input, init) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) {
        return FetchMockFactory.emptyResponse(200);
      }

      if (url.endsWith('/rest/api/3/project/KAN')) {
        return FetchMockFactory.jsonResponse(200, { key: 'KAN' });
      }

      if (init?.method === 'GET') {
        return FetchMockFactory.jsonResponse(200, {
          issues: [
            {
              id: '10002',
              key: 'KAN-55',
              self: 'https://jira.example/issue/10002',
              fields: {
                summary: 'Finding one',
                created: '2026-03-27T10:00:00.000+0000',
              },
            },
          ],
        });
      }

      return FetchMockFactory.emptyResponse(500);
    };

    const loginRes = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });
    assert.strictEqual(loginRes.status, 200);

    const recentRes = await request(app)
      .get('/tickets/recent?projectKey=KAN')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    assert.strictEqual(recentRes.status, 200);
    assert.strictEqual(recentRes.body.projectKey, 'KAN');
    assert.strictEqual(recentRes.body.count, 1);
    assert.strictEqual(recentRes.body.issues[0].issueKey, 'KAN-55');
  });

  it('GET /tickets/recent returns 400 when projectKey query param is missing', async () => {
    global.fetch = async () => FetchMockFactory.emptyResponse(200);

    const loginRes = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });
    assert.strictEqual(loginRes.status, 200);

    const recentRes = await request(app)
      .get('/tickets/recent')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    assert.strictEqual(recentRes.status, 400);
    assert.strictEqual(recentRes.body.code, 'VALIDATION_ERROR');
  });

  it('GET /tickets/recent queries Jira with app-created label filter', async () => {
    let capturedSearchUrl = '';

    global.fetch = async (input, init) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) {
        return FetchMockFactory.emptyResponse(200);
      }

      if (url.endsWith('/rest/api/3/project/KAN')) {
        return FetchMockFactory.jsonResponse(200, { key: 'KAN' });
      }

      if (url.includes('/rest/api/3/search')) {
        capturedSearchUrl = url;
        return FetchMockFactory.jsonResponse(200, { issues: [] });
      }

      return FetchMockFactory.emptyResponse(500);
    };

    const loginRes = await request(app).post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });
    assert.strictEqual(loginRes.status, 200);

    const recentRes = await request(app)
      .get('/tickets/recent?projectKey=KAN')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    assert.strictEqual(recentRes.status, 200);
    assert.ok(capturedSearchUrl.includes('/rest/api/3/search'));
    const decoded = decodeURIComponent(capturedSearchUrl);
    assert.match(decoded, /labels = "identityhub-finding"/);
    assert.match(decoded, /project = "KAN"/);
  });
});
