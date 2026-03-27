import { createHash, randomUUID } from 'crypto';
import { AuthConstants } from '../constants/AuthConstants';
import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { JiraConstants } from '../constants/JiraConstants';
import { createHttpError } from '../middleware/errorHandlers/createHttpError';
import {
  AuthenticatedUser,
  AuthTokenPayload,
  JiraLoginInput,
  JoseProviderContract,
  LoginResult,
} from '../interfaces/auth';
import { HttpServer } from './httpServer';

export class AuthService {
  constructor(
    private joseProvider: JoseProviderContract,
    private httpServer: HttpServer
  ) {}

  public async loginWithJira(input: JiraLoginInput): Promise<LoginResult> {
    const jose = await this.joseProvider.getJose();
    await this.validateJiraCredentials(input);

    const expiresInSeconds = this.getTokenTtlSeconds();
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const key = this.getAuthSecret();
    const payload: AuthTokenPayload = {
      email: input.email,
      jiraApiToken: input.jiraApiToken,
    };

    const token = await new jose.EncryptJWT(payload)
      .setProtectedHeader({
        alg: AuthConstants.AUTH_TOKEN_ALGORITHM,
        enc: AuthConstants.AUTH_TOKEN_ENCRYPTION,
        typ: AuthConstants.AUTH_TOKEN_TYPE_HEADER,
      })
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
      const jose = await this.joseProvider.getJose();
      const decrypted = await jose.jwtDecrypt(token, this.getAuthSecret(), {
        clockTolerance: AuthConstants.AUTH_CLOCK_TOLERANCE_SECONDS,
      });
      const email = decrypted.payload.email;
      const jiraApiToken = decrypted.payload.jiraApiToken;
      if (typeof email !== 'string' || typeof jiraApiToken !== 'string') {
        throw createHttpError(HttpStatusConstants.UNAUTHORIZED, 'Invalid auth token payload', {
          code: 'INVALID_AUTH_TOKEN',
        });
      }
      return { email, jiraApiToken };
    } catch (error) {
      if (error instanceof Error) {
        const code = Reflect.get(error, 'code');
        if (typeof code === 'string' && code.startsWith('ERR_')) {
          throw createHttpError(HttpStatusConstants.UNAUTHORIZED, 'Invalid or expired auth token', {
            code: 'INVALID_AUTH_TOKEN',
          });
        }
      }
      throw error;
    }
  }

  private getAuthSecret(): Uint8Array {
    const secret = process.env[AuthConstants.AUTH_TOKEN_SECRET_ENV];
    if (!secret || secret.trim().length < AuthConstants.AUTH_TOKEN_MIN_SECRET_LENGTH) {
      throw createHttpError(
        HttpStatusConstants.INTERNAL_SERVER_ERROR,
        'AUTH_TOKEN_SECRET must be set with at least 32 characters',
        {
          code: 'CONFIGURATION_ERROR',
        }
      );
    }
    return createHash('sha256').update(secret, 'utf8').digest();
  }

  private getTokenTtlSeconds(): number {
    const ttlFromEnv = Number(process.env[AuthConstants.AUTH_TOKEN_TTL_ENV]);
    if (Number.isFinite(ttlFromEnv) && ttlFromEnv > 0) {
      return ttlFromEnv;
    }
    return AuthConstants.DEFAULT_TOKEN_TTL_SECONDS;
  }

  private getJiraMyselfUrl(): string {
    const baseUrl = process.env[JiraConstants.JIRA_BASE_URL_ENV];
    if (!baseUrl || baseUrl.trim().length === 0) {
      throw createHttpError(
        HttpStatusConstants.INTERNAL_SERVER_ERROR,
        'JIRA_BASE_URL must be set (e.g. https://your-domain.atlassian.net)',
        {
          code: 'CONFIGURATION_ERROR',
        }
      );
    }
    return `${baseUrl.replace(/\/$/, '')}${JiraConstants.JIRA_API_PATH_MYSELF}`;
  }

  private async validateJiraCredentials(input: JiraLoginInput): Promise<void> {
    const basicAuthValue = Buffer.from(`${input.email}:${input.jiraApiToken}`).toString('base64');
    const response = await this.httpServer.get(this.getJiraMyselfUrl(), {
      Authorization: `Basic ${basicAuthValue}`,
      Accept: 'application/json',
    });

    if (
      response.status === HttpStatusConstants.UNAUTHORIZED ||
      response.status === HttpStatusConstants.FORBIDDEN
    ) {
      throw createHttpError(HttpStatusConstants.UNAUTHORIZED, 'Invalid Jira credentials', {
        code: 'INVALID_JIRA_CREDENTIALS',
      });
    }

    if (!response.ok) {
      throw createHttpError(
        HttpStatusConstants.BAD_GATEWAY,
        'Failed to validate Jira credentials',
        {
          code: 'JIRA_VALIDATION_FAILED',
          details: { status: response.status },
        }
      );
    }
  }
}
