import { createHash, randomUUID } from 'crypto';
import { createHttpError } from '../middleware/errorHandler';
import {
  AuthenticatedUser,
  AuthTokenPayload,
  JiraLoginInput,
  LoginResult,
} from '../interfaces/auth';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export interface EncryptJWTLike {
  setProtectedHeader(header: Record<string, unknown>): EncryptJWTLike;
  setIssuedAt(issuedAt: number): EncryptJWTLike;
  setNotBefore(notBefore: number): EncryptJWTLike;
  setExpirationTime(exp: number): EncryptJWTLike;
  setJti(jti: string): EncryptJWTLike;
  encrypt(key: Uint8Array): Promise<string>;
}

export interface JoseModuleContract {
  EncryptJWT: new (payload: Record<string, unknown>) => EncryptJWTLike;
  jwtDecrypt(
    token: string,
    key: Uint8Array,
    options?: { clockTolerance?: number }
  ): Promise<{ payload: Record<string, unknown> }>;
}

export class AuthService {
  public async loginWithJira(input: JiraLoginInput): Promise<LoginResult> {
    const jose = await this.loadJose();
    await this.validateJiraCredentials(input);

    const expiresInSeconds = this.getTokenTtlSeconds();
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const key = this.getAuthSecret();
    const payload: AuthTokenPayload = {
      email: input.email,
      jiraApiToken: input.jiraApiToken,
    };

    const token = await new jose.EncryptJWT(payload)
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

  public async verifyAuthToken(token: string): Promise<AuthenticatedUser> {
    try {
      const jose = await this.loadJose();
      const decrypted = await jose.jwtDecrypt(token, this.getAuthSecret(), {
        clockTolerance: 5,
      });
      const email = decrypted.payload.email;
      const jiraApiToken = decrypted.payload.jiraApiToken;
      if (typeof email !== 'string' || typeof jiraApiToken !== 'string') {
        throw createHttpError(401, 'Invalid auth token payload', { code: 'INVALID_AUTH_TOKEN' });
      }
      return { email, jiraApiToken };
    } catch (error) {
      if (error instanceof Error) {
        const code = Reflect.get(error, 'code');
        if (typeof code === 'string' && code.startsWith('ERR_')) {
          throw createHttpError(401, 'Invalid or expired auth token', {
            code: 'INVALID_AUTH_TOKEN',
          });
        }
      }
      throw error;
    }
  }

  private async loadJose(): Promise<JoseModuleContract> {
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const loaded = await dynamicImport('jose');
    return loaded;
  }

  private getAuthSecret(): Uint8Array {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (!secret || secret.trim().length < 32) {
      throw createHttpError(500, 'AUTH_TOKEN_SECRET must be set with at least 32 characters', {
        code: 'CONFIGURATION_ERROR',
      });
    }
    return createHash('sha256').update(secret, 'utf8').digest();
  }

  private getTokenTtlSeconds(): number {
    const ttlFromEnv = Number(process.env.AUTH_TOKEN_TTL_SECONDS);
    if (Number.isFinite(ttlFromEnv) && ttlFromEnv > 0) {
      return ttlFromEnv;
    }
    return DEFAULT_TOKEN_TTL_SECONDS;
  }

  private getJiraMyselfUrl(): string {
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

  private async validateJiraCredentials(input: JiraLoginInput): Promise<void> {
    const basicAuthValue = Buffer.from(`${input.email}:${input.jiraApiToken}`).toString('base64');
    const response = await fetch(this.getJiraMyselfUrl(), {
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
}
