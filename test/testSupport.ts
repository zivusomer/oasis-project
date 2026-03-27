const request = require('supertest');
const app = require('../src/app').default;

export class FetchMockFactory {
  public static getFetchUrl(input: unknown): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (input && typeof input === 'object' && 'url' in input) {
      return String(input.url || '');
    }
    return String(input);
  }

  public static jsonResponse(status: number, payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  public static emptyResponse(status: number): Response {
    return new Response('', { status });
  }
}

export class ApiTestSupport {
  private static originalFetch: typeof global.fetch;

  public static beforeEach(): void {
    ApiTestSupport.originalFetch = global.fetch;
    process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
    process.env.AUTH_TOKEN_SECRET = '12345678901234567890123456789012';
  }

  public static afterEach(): void {
    global.fetch = ApiTestSupport.originalFetch;
  }

  public static getAppRequest() {
    return request(app);
  }

  public static async loginAndGetToken(): Promise<string> {
    const loginRes = await ApiTestSupport.getAppRequest().post('/auth/login').send({
      email: 'user@example.com',
      jiraApiToken: 'valid-token',
    });
    if (loginRes.status !== 200 || typeof loginRes.body.token !== 'string') {
      throw new Error('Failed to login and get token in test setup');
    }
    return loginRes.body.token;
  }
}
