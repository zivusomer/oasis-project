import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { JiraConstants } from '../constants/JiraConstants';
import {
  CreateTicketInput,
  CreateTicketResult,
  JiraIssueCreateResponse,
} from '../interfaces/tickets';
import { createHttpError } from '../middleware/errorHandlers/createHttpError';
import { HttpServer } from './httpServer';
import { JiraGateway } from './jiraGateway';

export class CreateTicketService {
  constructor(
    private jiraGateway: JiraGateway,
    private httpServer: HttpServer
  ) {}

  public async createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
    const basicAuthValue = this.jiraGateway.buildBasicAuth(input.authUser);
    const jiraBaseUrl = this.jiraGateway.getJiraBaseUrl();
    await this.jiraGateway.validateProjectKey(jiraBaseUrl, basicAuthValue, input.projectKey);

    const response = await this.httpServer.postJson(
      `${jiraBaseUrl}${JiraConstants.JIRA_API_PATH_ISSUE}`,
      {
        fields: {
          project: { key: input.projectKey },
          summary: input.title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: input.description }],
              },
            ],
          },
          issuetype: { name: input.issueTypeName },
          labels: [JiraConstants.JIRA_LABEL_APP_CREATED],
        },
      },
      {
        Authorization: `Basic ${basicAuthValue}`,
        Accept: 'application/json',
      }
    );

    this.jiraGateway.ensureValidCredentials(response);

    if (!response.ok) {
      const jiraError = await this.jiraGateway.readJiraError(response);
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

    return {
      issueId: created.id,
      issueKey: created.key,
      issueUrl: `${jiraBaseUrl}/browse/${created.key}`,
      jiraSelfUrl: created.self,
    };
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
}
