import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { JiraConstants } from '../constants/JiraConstants';
import {
  JiraIssueSearchItem,
  JiraIssueSearchResponse,
  RecentTicketsInput,
  RecentTicketsResult,
} from '../interfaces/tickets';
import { createHttpError } from '../middleware/errorHandlers/createHttpError';
import { HttpServer } from './httpServer';
import { JiraGateway } from './jiraGateway';

export class RecentTicketsService {
  constructor(
    private jiraGateway: JiraGateway,
    private httpServer: HttpServer
  ) {}

  public async getRecentTickets(input: RecentTicketsInput): Promise<RecentTicketsResult> {
    const basicAuthValue = this.jiraGateway.buildBasicAuth(input.authUser);
    const jiraBaseUrl = this.jiraGateway.getJiraBaseUrl();
    await this.jiraGateway.validateProjectKey(jiraBaseUrl, basicAuthValue, input.projectKey);

    const jql = `project = "${input.projectKey}" AND labels = "${JiraConstants.JIRA_LABEL_APP_CREATED}" ORDER BY created DESC`;
    const searchUrl = `${jiraBaseUrl}${JiraConstants.JIRA_API_PATH_SEARCH}?jql=${encodeURIComponent(
      jql
    )}&maxResults=${JiraConstants.JIRA_MAX_RECENT_RESULTS}&fields=${JiraConstants.JIRA_RECENT_FIELDS}`;
    const response = await this.httpServer.get(searchUrl, {
      Authorization: `Basic ${basicAuthValue}`,
      Accept: 'application/json',
    });

    this.jiraGateway.ensureValidCredentials(response);

    if (!response.ok) {
      const jiraError = await this.jiraGateway.readJiraError(response);
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

    return {
      projectKey: input.projectKey,
      count: issues.length,
      issues,
    };
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
    if (!labels) {
      return false;
    }
    return labels.includes(JiraConstants.JIRA_LABEL_APP_CREATED);
  }
}
