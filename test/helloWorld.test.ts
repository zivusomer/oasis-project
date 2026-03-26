const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app').default;

describe('GET /hello-world', () => {
  it('returns 200 and { message: "Hello, World!" }', async () => {
    const res = await request(app).get('/hello-world');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Hello, World!');
  });
});
