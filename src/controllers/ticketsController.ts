import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { JiraConstants } from '../constants/JiraConstants';
import { Request, Response } from 'express';
import { CreateTicketService } from '../services/createTicketService';
import { RecentTicketsService } from '../services/recentTicketsService';
import { createHttpError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../interfaces/auth';

export class TicketsController {
  constructor(
    private createTicketService: CreateTicketService,
    private recentTicketsService: RecentTicketsService
  ) {}

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

    const result = await this.createTicketService.createTicket({
      authUser,
      projectKey,
      title,
      description,
      issueTypeName,
    });
    res.status(201).json(result);
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

    const result = await this.recentTicketsService.getRecentTickets({
      authUser,
      projectKey,
    });
    res.status(200).json(result);
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
}
