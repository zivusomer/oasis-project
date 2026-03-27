import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { JiraConstants } from '../constants/JiraConstants';
import { Request, Response } from 'express';
import { createHttpError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../interfaces/auth';
import {
  JiraIssueCreateResponse,
  JiraIssueSearchItem,
  JiraIssueSearchResponse,
} from '../interfaces/tickets';

export class TicketsController {
  public async createTicket(req: Request, res: Response): Promise<void> {
    const authUser = this.getAuthenticatedUser(req);
    const projectKey = req.body.projectKey;
    const title = req.body.title;
    const description = req.body.description;
    const issueTypeName =
      req.body.issueType && req.body.issueType.trim()
        ? req.body.issueType.trim()
        : JiraConstants.JIRA_DEFAULT_ISSUE_TYPE;

    if (!projectKey || !title || !description) {
      throw createHttpError(
        HttpStatusConstants.BAD_REQUEST,
        'projectKey, title, and description are required',
        {
          code: 'VALIDATION_ERROR',
        }
      );
    }

    const basicAuthValue = this.buildBasicAuth(authUser);
    const jiraBaseUrl = this.getJiraBaseUrl();
    await this.validateProjectKey(jiraBaseUrl, basicAuthValue, projectKey);

    const response = await fetch(`${jiraBaseUrl}${JiraConstants.JIRA_API_PATH_ISSUE}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuthValue}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: description }],
              },
            ],
          },
          issuetype: { name: issueTypeName },
          labels: [JiraConstants.JIRA_LABEL_APP_CREATED],
        },
      }),
    });

    this.throwIfInvalidJiraCredentials(response);

    if (!response.ok) {
      const jiraError = await this.readJiraError(response);
      const isClientRequestError =
        response.status >= HttpStatusConstants.BAD_REQUEST &&
        response.status < HttpStatusConstants.INTERNAL_SERVER_ERROR;
      throw createHttpError(
        isClientRequestError ? HttpStatusConstants.BAD_REQUEST : HttpStatusConstants.BAD_GATEWAY,
        isClientRequestError ? 'Invalid Jira issue payload' : 'Failed to create Jira issue',
        {
          code: isClientRequestError ? 'JIRA_INVALID_ISSUE_REQUEST' : 'JIRA_CREATE_ISSUE_FAILED',
          details: jiraError,
        }
      );
    }

    const created = await this.parseIssueCreateResponse(response);
    if (!created.key) {
      throw createHttpError(
        HttpStatusConstants.BAD_GATEWAY,
        'Jira issue creation response missing issue key',
        {
          code: 'JIRA_INVALID_RESPONSE',
        }
      );
    }

    res.status(201).json({
      issueId: created.id,
      issueKey: created.key,
      issueUrl: `${jiraBaseUrl}/browse/${created.key}`,
      jiraSelfUrl: created.self,
    });
  }

  public async getRecentTickets(req: Request, res: Response): Promise<void> {
    const authUser = this.getAuthenticatedUser(req);
    const dynamicProjectKey = Reflect.get(req.query, 'projectKey');
    const projectKey = typeof dynamicProjectKey === 'string' ? dynamicProjectKey.trim() : '';
    if (!projectKey) {
      throw createHttpError(
        HttpStatusConstants.BAD_REQUEST,
        'projectKey query parameter is required',
        {
          code: 'VALIDATION_ERROR',
        }
      );
    }

    const basicAuthValue = this.buildBasicAuth(authUser);
    const jiraBaseUrl = this.getJiraBaseUrl();
    await this.validateProjectKey(jiraBaseUrl, basicAuthValue, projectKey);

    const jql = `project = "${projectKey}" AND labels = "${JiraConstants.JIRA_LABEL_APP_CREATED}" ORDER BY created DESC`;
    const searchUrl = `${jiraBaseUrl}${JiraConstants.JIRA_API_PATH_SEARCH}?jql=${encodeURIComponent(
      jql
    )}&maxResults=${JiraConstants.JIRA_MAX_RECENT_RESULTS}&fields=${JiraConstants.JIRA_RECENT_FIELDS}`;
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuthValue}`,
        Accept: 'application/json',
      },
    });

    this.throwIfInvalidJiraCredentials(response);

    if (!response.ok) {
      const jiraError = await this.readJiraError(response);
      const isClientRequestError =
        response.status >= HttpStatusConstants.BAD_REQUEST &&
        response.status < HttpStatusConstants.INTERNAL_SERVER_ERROR;
      throw createHttpError(
        isClientRequestError ? HttpStatusConstants.BAD_REQUEST : HttpStatusConstants.BAD_GATEWAY,
        isClientRequestError
          ? 'Invalid recent tickets query'
          : 'Failed to fetch recent Jira tickets',
        {
          code: isClientRequestError ? 'JIRA_INVALID_RECENT_QUERY' : 'JIRA_RECENT_FETCH_FAILED',
          details: jiraError,
        }
      );
    }

    const searchResult = await this.parseIssueSearchResponse(response);
    const issues = (searchResult.issues || [])
      .filter((issue: JiraIssueSearchItem) => this.isAppCreatedIssue(issue))
      .map((issue: JiraIssueSearchItem) => ({
        issueId: issue.id,
        issueKey: issue.key,
        issueUrl: issue.key ? `${jiraBaseUrl}/browse/${issue.key}` : undefined,
        summary: issue.fields?.summary,
        createdAt: issue.fields?.created,
        jiraSelfUrl: issue.self,
      }));

    res.status(200).json({
      projectKey,
      count: issues.length,
      issues,
    });
  }

  private getAuthenticatedUser(req: Request): AuthenticatedUser {
    const authUser = Reflect.get(req, 'authUser');
    if (!authUser || typeof authUser !== 'object') {
      throw createHttpError(
        HttpStatusConstants.UNAUTHORIZED,
        'Missing authenticated user context',
        {
          code: 'UNAUTHORIZED',
        }
      );
    }

    const email = Reflect.get(authUser, 'email');
    const jiraApiToken = Reflect.get(authUser, 'jiraApiToken');
    if (typeof email !== 'string' || typeof jiraApiToken !== 'string') {
      throw createHttpError(
        HttpStatusConstants.UNAUTHORIZED,
        'Missing authenticated user context',
        {
          code: 'UNAUTHORIZED',
        }
      );
    }
    return { email, jiraApiToken };
  }

  private buildBasicAuth(authUser: AuthenticatedUser): string {
    return Buffer.from(`${authUser.email}:${authUser.jiraApiToken}`).toString('base64');
  }

  private throwIfInvalidJiraCredentials(response: globalThis.Response): void {
    if (
      response.status === HttpStatusConstants.UNAUTHORIZED ||
      response.status === HttpStatusConstants.FORBIDDEN
    ) {
      throw createHttpError(HttpStatusConstants.UNAUTHORIZED, 'Invalid Jira credentials', {
        code: 'INVALID_JIRA_CREDENTIALS',
      });
    }
  }

  private async validateProjectKey(
    jiraBaseUrl: string,
    basicAuthValue: string,
    projectKey: string
  ): Promise<void> {
    const response = await fetch(
      `${jiraBaseUrl}${JiraConstants.JIRA_API_PATH_PROJECT}/${encodeURIComponent(projectKey)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${basicAuthValue}`,
          Accept: 'application/json',
        },
      }
    );

    this.throwIfInvalidJiraCredentials(response);

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

  private getJiraBaseUrl(): string {
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

  private async readJiraError(response: globalThis.Response): Promise<unknown> {
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

  private async parseIssueCreateResponse(
    response: globalThis.Response
  ): Promise<JiraIssueCreateResponse> {
    const json = await response.json();
    if (json && typeof json === 'object') {
      return json;
    }
    return {};
  }

  private async parseIssueSearchResponse(
    response: globalThis.Response
  ): Promise<JiraIssueSearchResponse> {
    const json = await response.json();
    if (json && typeof json === 'object') {
      return json;
    }
    return { issues: [] };
  }

  private isAppCreatedIssue(issue: JiraIssueSearchItem): boolean {
    const labels = issue.fields?.labels;
    if (!labels) return false;
    return labels.includes(JiraConstants.JIRA_LABEL_APP_CREATED);
  }
}
