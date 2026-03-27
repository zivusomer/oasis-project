const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
import { ApiTestSupport, FetchMockFactory } from './testSupport';

describe('POST /auth/login', () => {
  beforeEach(() => ApiTestSupport.beforeEach());
  afterEach(() => ApiTestSupport.afterEach());

  it('returns 200 with bearer token for valid Jira credentials', async () => {
    global.fetch = async () => FetchMockFactory.emptyResponse(200);

    const res = await ApiTestSupport.getAppRequest().post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.tokenType, 'Bearer');
    assert.strictEqual(typeof res.body.token, 'string');
    assert.ok(res.body.token.length > 0);
    assert.strictEqual(typeof res.body.expiresInSeconds, 'number');
  });

  it('returns 401 for invalid Jira credentials', async () => {
    global.fetch = async () => FetchMockFactory.emptyResponse(401);

    const res = await ApiTestSupport.getAppRequest().post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'invalid-token',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_JIRA_CREDENTIALS');
  });
});
