import { Request, Response } from 'express';
import { createHttpError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../services/authService';

type FetchResponse = globalThis.Response;

export async function createTicket(req: Request, res: Response): Promise<void> {
  const authUser = (req as Request & { authUser?: AuthenticatedUser }).authUser;
  if (!authUser) {
    throw createHttpError(401, 'Missing authenticated user context', { code: 'UNAUTHORIZED' });
  }

  const { projectKey, title, description, issueType } = req.body as {
    projectKey?: string;
    title?: string;
    description?: string;
    issueType?: string;
  };

  if (!projectKey || !title || !description) {
    throw createHttpError(400, 'projectKey, title, and description are required', {
      code: 'VALIDATION_ERROR',
    });
  }

  const basicAuthValue = Buffer.from(`${authUser.email}:${authUser.jiraApiToken}`).toString(
    'base64'
  );
  const jiraBaseUrl = getJiraBaseUrl();
  await validateProjectKey(jiraBaseUrl, basicAuthValue, projectKey);

  const issueTypeName = issueType?.trim() ? issueType.trim() : 'Task';
  const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
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
        labels: ['identityhub-finding'],
      },
    }),
  });

  if (response.status === 401 || response.status === 403) {
    throw createHttpError(401, 'Invalid Jira credentials', { code: 'INVALID_JIRA_CREDENTIALS' });
  }

  if (!response.ok) {
    const jiraError = await readJiraError(response);
    const isClientRequestError = response.status >= 400 && response.status < 500;
    throw createHttpError(
      isClientRequestError ? 400 : 502,
      isClientRequestError ? 'Invalid Jira issue payload' : 'Failed to create Jira issue',
      {
        code: isClientRequestError ? 'JIRA_INVALID_ISSUE_REQUEST' : 'JIRA_CREATE_ISSUE_FAILED',
        details: jiraError,
      }
    );
  }

  const created = (await response.json()) as { id?: string; key?: string; self?: string };
  if (!created.key) {
    throw createHttpError(502, 'Jira issue creation response missing issue key', {
      code: 'JIRA_INVALID_RESPONSE',
    });
  }

  res.status(201).json({
    issueId: created.id,
    issueKey: created.key,
    issueUrl: `${jiraBaseUrl}/browse/${created.key}`,
    jiraSelfUrl: created.self,
  });
}

export async function getRecentTickets(req: Request, res: Response): Promise<void> {
  const authUser = (req as Request & { authUser?: AuthenticatedUser }).authUser;
  if (!authUser) {
    throw createHttpError(401, 'Missing authenticated user context', { code: 'UNAUTHORIZED' });
  }

  const projectKey = String(req.query.projectKey || '').trim();
  if (!projectKey) {
    throw createHttpError(400, 'projectKey query parameter is required', {
      code: 'VALIDATION_ERROR',
    });
  }

  const basicAuthValue = Buffer.from(`${authUser.email}:${authUser.jiraApiToken}`).toString(
    'base64'
  );
  const jiraBaseUrl = getJiraBaseUrl();
  await validateProjectKey(jiraBaseUrl, basicAuthValue, projectKey);

  const jql = `project = "${projectKey}" AND labels = "identityhub-finding" ORDER BY created DESC`;
  const searchUrl = `${jiraBaseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(
    jql
  )}&maxResults=10&fields=summary,created`;
  const response = await fetch(searchUrl, {
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
    const jiraError = await readJiraError(response);
    const isClientRequestError = response.status >= 400 && response.status < 500;
    throw createHttpError(
      isClientRequestError ? 400 : 502,
      isClientRequestError ? 'Invalid recent tickets query' : 'Failed to fetch recent Jira tickets',
      {
        code: isClientRequestError ? 'JIRA_INVALID_RECENT_QUERY' : 'JIRA_RECENT_FETCH_FAILED',
        details: jiraError,
      }
    );
  }

  const searchResult = (await response.json()) as {
    issues?: Array<{
      id?: string;
      key?: string;
      self?: string;
      fields?: { summary?: string; created?: string };
    }>;
  };

  const issues = (searchResult.issues || []).map((issue) => ({
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

async function validateProjectKey(
  jiraBaseUrl: string,
  basicAuthValue: string,
  projectKey: string
): Promise<void> {
  const response = await fetch(
    `${jiraBaseUrl}/rest/api/3/project/${encodeURIComponent(projectKey)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuthValue}`,
        Accept: 'application/json',
      },
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw createHttpError(401, 'Invalid Jira credentials', { code: 'INVALID_JIRA_CREDENTIALS' });
  }

  if (response.status === 404) {
    throw createHttpError(400, `Invalid Jira project key: ${projectKey}`, {
      code: 'INVALID_PROJECT_KEY',
    });
  }

  if (!response.ok) {
    throw createHttpError(502, 'Failed to validate Jira project key', {
      code: 'JIRA_PROJECT_VALIDATION_FAILED',
      details: {
        status: response.status,
      },
    });
  }
}

function getJiraBaseUrl(): string {
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
  return baseUrl.replace(/\/$/, '');
}

async function readJiraError(response: FetchResponse): Promise<unknown> {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      // Fall through to text response.
    }
  }

  const text = await response.text();
  return text || undefined;
}
