const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
import { ApiTestSupport, FetchMockFactory } from './testSupport';

describe('GET /tickets/recent', () => {
  beforeEach(() => ApiTestSupport.beforeEach());
  afterEach(() => ApiTestSupport.afterEach());

  it('returns 200 with recent issues when authenticated', async () => {
    global.fetch = async (input: unknown, init?: RequestInit) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) return FetchMockFactory.emptyResponse(200);
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
                labels: ['identityhub-finding'],
              },
            },
          ],
        });
      }
      return FetchMockFactory.emptyResponse(500);
    };

    const token = await ApiTestSupport.loginAndGetToken();
    const res = await ApiTestSupport.getAppRequest()
      .get('/tickets/recent?projectKey=KAN')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.projectKey, 'KAN');
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.issues[0].issueKey, 'KAN-55');
  });

  it('returns 400 when projectKey query param is missing', async () => {
    global.fetch = async () => FetchMockFactory.emptyResponse(200);

    const token = await ApiTestSupport.loginAndGetToken();
    const res = await ApiTestSupport.getAppRequest()
      .get('/tickets/recent')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
  });

  it('queries Jira with app-created label filter', async () => {
    let capturedSearchUrl = '';

    global.fetch = async (input: unknown) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) return FetchMockFactory.emptyResponse(200);
      if (url.endsWith('/rest/api/3/project/KAN')) {
        return FetchMockFactory.jsonResponse(200, { key: 'KAN' });
      }
      if (url.includes('/rest/api/3/search')) {
        capturedSearchUrl = url;
        return FetchMockFactory.jsonResponse(200, { issues: [] });
      }
      return FetchMockFactory.emptyResponse(500);
    };

    const token = await ApiTestSupport.loginAndGetToken();
    const res = await ApiTestSupport.getAppRequest()
      .get('/tickets/recent?projectKey=KAN')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.ok(capturedSearchUrl.includes('/rest/api/3/search'));
    const decoded = decodeURIComponent(capturedSearchUrl);
    assert.match(decoded, /labels = "identityhub-finding"/);
    assert.match(decoded, /project = "KAN"/);
  });

  it('returns only issues created by this app when Jira response contains mixed issues', async () => {
    global.fetch = async (input: unknown, init?: RequestInit) => {
      const url = FetchMockFactory.getFetchUrl(input);
      if (url.endsWith('/rest/api/3/myself')) return FetchMockFactory.emptyResponse(200);
      if (url.endsWith('/rest/api/3/project/KAN')) {
        return FetchMockFactory.jsonResponse(200, { key: 'KAN' });
      }
      if (init?.method === 'GET') {
        return FetchMockFactory.jsonResponse(200, {
          issues: [
            {
              id: '10011',
              key: 'KAN-11',
              self: 'https://jira.example/issue/10011',
              fields: {
                summary: 'Created by app',
                created: '2026-03-27T10:00:00.000+0000',
                labels: ['identityhub-finding'],
              },
            },
            {
              id: '10012',
              key: 'KAN-12',
              self: 'https://jira.example/issue/10012',
              fields: {
                summary: 'Not created by app',
                created: '2026-03-27T10:01:00.000+0000',
                labels: ['some-other-label'],
              },
            },
          ],
        });
      }
      return FetchMockFactory.emptyResponse(500);
    };

    const token = await ApiTestSupport.loginAndGetToken();
    const res = await ApiTestSupport.getAppRequest()
      .get('/tickets/recent?projectKey=KAN')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.issues.length, 1);
    assert.strictEqual(res.body.issues[0].issueKey, 'KAN-11');
  });
});
