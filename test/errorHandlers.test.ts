const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
import { createHttpError } from '../src/middleware/errorHandlers/createHttpError';
import { errorHandler } from '../src/middleware/errorHandlers/errorHandler';
import { AppHttpError } from '../src/middleware/errorHandlers/AppHttpError';

class TestResponse {
  public statusCode = 0;
  public payload: unknown;

  public status(code: number): TestResponse {
    this.statusCode = code;
    return this;
  }

  public json(payload: unknown): TestResponse {
    this.payload = payload;
    return this;
  }
}

function invokeErrorHandler(error: Error, res: TestResponse): void {
  Reflect.apply(errorHandler, undefined, [error, {}, res, () => {}]);
}

function readPayloadField(payload: unknown, field: string): unknown {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  return Reflect.get(payload, field);
}

describe('App error handlers', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    console.error = originalConsoleError;
  });

  it('createHttpError returns AppHttpError with metadata', () => {
    const error = createHttpError(400, 'bad input', {
      code: 'VALIDATION_ERROR',
      details: { field: 'email' },
    });

    assert.ok(error instanceof AppHttpError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.code, 'VALIDATION_ERROR');
    assert.deepStrictEqual(error.details, { field: 'email' });
  });

  it('errorHandler returns non-masked payload for known 4xx AppHttpError', () => {
    const res = new TestResponse();
    invokeErrorHandler(
      createHttpError(401, 'Missing Authorization header', { code: 'MISSING_AUTH_HEADER' }),
      res
    );

    assert.strictEqual(res.statusCode, 401);
    const payload = Reflect.get(res, 'payload');
    assert.strictEqual(readPayloadField(payload, 'error'), 'Missing Authorization header');
    assert.strictEqual(readPayloadField(payload, 'code'), 'MISSING_AUTH_HEADER');
    assert.strictEqual(typeof readPayloadField(payload, 'stack'), 'string');
  });

  it('errorHandler masks 5xx messages in production and logs the error', () => {
    process.env.NODE_ENV = 'production';
    let logged: unknown;
    console.error = (...args: unknown[]) => {
      logged = args[0];
    };

    const res = new TestResponse();
    const internalError = createHttpError(500, 'db connection failed', { code: 'INTERNAL' });
    invokeErrorHandler(internalError, res);

    assert.strictEqual(res.statusCode, 500);
    const payload = Reflect.get(res, 'payload');
    assert.strictEqual(readPayloadField(payload, 'error'), 'Internal server error');
    assert.strictEqual(readPayloadField(payload, 'stack'), undefined);
    assert.strictEqual(logged, internalError);
  });

  it('errorHandler maps generic errors to 500 and keeps message in non-production', () => {
    const res = new TestResponse();
    const genericError = new Error('unexpected crash');
    invokeErrorHandler(genericError, res);

    assert.strictEqual(res.statusCode, 500);
    const payload = Reflect.get(res, 'payload');
    assert.strictEqual(readPayloadField(payload, 'error'), 'unexpected crash');
    assert.strictEqual(typeof readPayloadField(payload, 'stack'), 'string');
  });

  it('errorHandler uses dynamic status/code/details when present', () => {
    const res = new TestResponse();
    const error = new Error('custom');
    Reflect.set(error, 'statusCode', 418);
    Reflect.set(error, 'code', 'TEAPOT');
    Reflect.set(error, 'details', { source: 'kettle' });
    invokeErrorHandler(error, res);

    assert.strictEqual(res.statusCode, 418);
    const payload = Reflect.get(res, 'payload');
    assert.strictEqual(readPayloadField(payload, 'error'), 'custom');
    assert.strictEqual(readPayloadField(payload, 'code'), 'TEAPOT');
    assert.deepStrictEqual(readPayloadField(payload, 'details'), { source: 'kettle' });
  });

  it('errorHandler falls back to 500 when dynamic status is out of range', () => {
    const res = new TestResponse();
    const error = new Error('bad status');
    Reflect.set(error, 'statusCode', 700);
    invokeErrorHandler(error, res);

    assert.strictEqual(res.statusCode, 500);
  });
});
