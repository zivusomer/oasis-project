export class HttpServer {
  public async request(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init);
  }

  public async get(url: string, headers?: Record<string, string>): Promise<Response> {
    return this.request(url, {
      method: 'GET',
      headers,
    });
  }

  public async postJson(
    url: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<Response> {
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    return this.request(url, {
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(body),
    });
  }
}
