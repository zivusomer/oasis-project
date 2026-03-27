import { createHash, randomUUID } from 'crypto';
import { createHttpError } from '../middleware/errorHandler';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export type JiraLoginInput = {
  email: string;
  jiraApiToken: string;
};

type AuthTokenPayload = {
  email: string;
  jiraApiToken: string;
};

export type AuthenticatedUser = {
  email: string;
  jiraApiToken: string;
};

export type LoginResult = {
  token: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
};

type JoseModule = {
  EncryptJWT: new (payload: Record<string, unknown>) => EncryptJWTLike;
  jwtDecrypt: (
    token: string,
    key: Uint8Array,
    options?: { clockTolerance?: number }
  ) => Promise<{ payload: Record<string, unknown> }>;
};

type EncryptJWTLike = {
  setProtectedHeader(header: Record<string, unknown>): EncryptJWTLike;
  setIssuedAt(issuedAt: number): EncryptJWTLike;
  setNotBefore(notBefore: number): EncryptJWTLike;
  setExpirationTime(exp: number): EncryptJWTLike;
  setJti(jti: string): EncryptJWTLike;
  encrypt(key: Uint8Array): Promise<string>;
};

async function loadJose(): Promise<JoseModule> {
  // Keep as true runtime dynamic import for CommonJS output.
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  return dynamicImport('jose') as Promise<JoseModule>;
}

export async function loginWithJira(input: JiraLoginInput): Promise<LoginResult> {
  const { EncryptJWT } = await loadJose();
  await validateJiraCredentials(input);

  const expiresInSeconds = getTokenTtlSeconds();
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const key = getAuthSecret();
  const payload: AuthTokenPayload = {
    email: input.email,
    jiraApiToken: input.jiraApiToken,
  };

  const token = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', typ: 'JWT' })
    .setIssuedAt(nowEpochSeconds)
    .setNotBefore(nowEpochSeconds)
    .setExpirationTime(nowEpochSeconds + expiresInSeconds)
    .setJti(randomUUID())
    .encrypt(key);

  return {
    token,
    tokenType: 'Bearer',
    expiresInSeconds,
  };
}

export async function verifyAuthToken(token: string): Promise<AuthenticatedUser> {
  try {
    const { jwtDecrypt } = await loadJose();
    const { payload } = await jwtDecrypt(token, getAuthSecret(), {
      clockTolerance: 5,
    });

    const email = payload.email;
    const jiraApiToken = payload.jiraApiToken;
    if (typeof email !== 'string' || typeof jiraApiToken !== 'string') {
      throw createHttpError(401, 'Invalid auth token payload', { code: 'INVALID_AUTH_TOKEN' });
    }

    return { email, jiraApiToken };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createHttpError(401, 'Invalid or expired auth token', { code: 'INVALID_AUTH_TOKEN' });
  }
}

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw createHttpError(500, 'AUTH_TOKEN_SECRET must be set with at least 32 characters', {
      code: 'CONFIGURATION_ERROR',
    });
  }
  // A256GCM with direct encryption (`alg: dir`) requires an exact 256-bit key.
  // Derive a fixed 32-byte key from the configured secret.
  return createHash('sha256').update(secret, 'utf8').digest();
}

function getTokenTtlSeconds(): number {
  const ttlFromEnv = Number(process.env.AUTH_TOKEN_TTL_SECONDS);
  if (Number.isFinite(ttlFromEnv) && ttlFromEnv > 0) {
    return ttlFromEnv;
  }
  return DEFAULT_TOKEN_TTL_SECONDS;
}

function getJiraMyselfUrl(): string {
  const baseUrl = process.env.JIRA_BASE_URL;
  if (!baseUrl || baseUrl.trim().length === 0) {
    throw createHttpError(
      500,
      'JIRA_BASE_URL must be set (e.g. https://your-domain.atlassian.net)',
      {
        code: 'CONFIGURATION_ERROR',
      }
    );
  }
  return `${baseUrl.replace(/\/$/, '')}/rest/api/3/myself`;
}

async function validateJiraCredentials(input: JiraLoginInput): Promise<void> {
  const basicAuthValue = Buffer.from(`${input.email}:${input.jiraApiToken}`).toString('base64');
  const jiraMyselfUrl = getJiraMyselfUrl();
  const response = await fetch(jiraMyselfUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${basicAuthValue}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw createHttpError(401, 'Invalid Jira credentials', { code: 'INVALID_JIRA_CREDENTIALS' });
  }

  if (!response.ok) {
    throw createHttpError(502, 'Failed to validate Jira credentials', {
      code: 'JIRA_VALIDATION_FAILED',
      details: { status: response.status },
    });
  }
}
