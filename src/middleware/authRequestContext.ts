import { Request } from 'express';
import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { AuthenticatedUser } from '../interfaces/auth';
import { createHttpError } from './errorHandler';

export class AuthRequestContext {
  public getAuthenticatedUser(req: Request): AuthenticatedUser {
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
