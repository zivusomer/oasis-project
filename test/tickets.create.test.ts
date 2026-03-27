const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
import { ApiTestSupport, FetchMockFactory } from './testSupport';

describe('POST /tickets', () => {
  beforeEach(() => ApiTestSupport.beforeEach());
  afterEach(() => ApiTestSupport.afterEach());

  it('returns 401 when Authorization header is missing', async () => {
    const res = await ApiTestSupport.getAppRequest().post('/tickets').send({
      projectKey: 'SEC',
      title: 'Test finding',
      description: 'Missing auth header should fail',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'MISSING_AUTH_HEADER');
  });

  it('returns 201 when using valid token and valid project key', async () => {
    global.fetch = async (input: unknown, init?: RequestInit) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) return FetchMockFactory.emptyResponse(200);
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

    const token = await ApiTestSupport.loginAndGetToken();
    const res = await ApiTestSupport.getAppRequest()
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectKey: 'SEC',
        title: 'Test finding',
        description: 'Should pass with valid token',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.issueKey, 'SEC-101');
    assert.strictEqual(res.body.issueUrl, 'https://example.atlassian.net/browse/SEC-101');
  });

  it('returns 400 for invalid Jira project key', async () => {
    global.fetch = async (input: unknown, init?: RequestInit) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) return FetchMockFactory.emptyResponse(200);
      if (url.endsWith('/rest/api/3/project/INVALID') && init?.method === 'GET') {
        return FetchMockFactory.emptyResponse(404);
      }
      return FetchMockFactory.emptyResponse(500);
    };

    const token = await ApiTestSupport.loginAndGetToken();
    const res = await ApiTestSupport.getAppRequest()
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectKey: 'INVALID',
        title: 'Test finding',
        description: 'Should fail for invalid project key',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'INVALID_PROJECT_KEY');
  });
});
