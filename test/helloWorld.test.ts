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

describe('GET /echo', () => {
  it('returns GET echo message with no body', async () => {
    const res = await request(app).get('/echo');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'GET request with no message posted, echo nothing');
  });
});

describe('POST /echo', () => {
  it('returns the message from the body', async () => {
    const res = await request(app).post('/echo').send({ message: 'hello from test' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'hello from test');
  });

  it('returns 400 when message is missing or not a string', async () => {
    const res = await request(app).post('/echo').send({});
    assert.strictEqual(res.status, 400);
  });
});
