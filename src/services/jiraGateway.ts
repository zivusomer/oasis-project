import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { JiraConstants } from '../constants/JiraConstants';
import { AuthenticatedUser } from '../interfaces/auth';
import { createHttpError } from '../middleware/errorHandlers/createHttpError';
import { HttpServer } from './httpServer';

export class JiraGateway {
  constructor(private httpServer: HttpServer) {}

  public buildBasicAuth(authUser: AuthenticatedUser): string {
    return Buffer.from(`${authUser.email}:${authUser.jiraApiToken}`).toString('base64');
  }

  public getJiraBaseUrl(): string {
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
    return baseUrl.replace(/\/$/, '');
  }

  public ensureValidCredentials(response: globalThis.Response): void {
    if (
      response.status === HttpStatusConstants.UNAUTHORIZED ||
      response.status === HttpStatusConstants.FORBIDDEN
    ) {
      throw createHttpError(HttpStatusConstants.UNAUTHORIZED, 'Invalid Jira credentials', {
        code: 'INVALID_JIRA_CREDENTIALS',
      });
    }
  }

  public async validateProjectKey(
    jiraBaseUrl: string,
    basicAuthValue: string,
    projectKey: string
  ): Promise<void> {
    const response = await this.httpServer.get(
      `${jiraBaseUrl}${JiraConstants.JIRA_API_PATH_PROJECT}/${encodeURIComponent(projectKey)}`,
      {
        Authorization: `Basic ${basicAuthValue}`,
        Accept: 'application/json',
      }
    );

    this.ensureValidCredentials(response);

    if (response.status === HttpStatusConstants.NOT_FOUND) {
      throw createHttpError(
        HttpStatusConstants.BAD_REQUEST,
        `Invalid Jira project key: ${projectKey}`,
        {
          code: 'INVALID_PROJECT_KEY',
        }
      );
    }

    if (!response.ok) {
      throw createHttpError(
        HttpStatusConstants.BAD_GATEWAY,
        'Failed to validate Jira project key',
        {
          code: 'JIRA_PROJECT_VALIDATION_FAILED',
          details: {
            status: response.status,
          },
        }
      );
    }
  }

  public async readJiraError(response: globalThis.Response): Promise<unknown> {
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return undefined;
      }
    }

    const text = await response.text();
    return text || undefined;
  }
}
