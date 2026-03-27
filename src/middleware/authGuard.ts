import { Request, Response, NextFunction } from 'express';
import { AuthConstants } from '../constants/AuthConstants';
import { HttpStatusConstants } from '../constants/HttpStatusConstants';
import { createHttpError } from './errorHandler';
import { AuthService } from '../services/authService';

export class AuthGuard {
  constructor(private authService: AuthService) {}

  public requireAuth(req: Request, _res: Response, next: NextFunction): void {
    let token = '';
    try {
      token = this.extractBearerToken(req.header(AuthConstants.AUTH_HEADER_NAME));
    } catch (error) {
      next(error);
      return;
    }

    this.authService
      .verifyAuthToken(token)
      .then((user) => {
        Reflect.set(req, 'authUser', user);
        next();
      })
      .catch(next);
  }

  private extractBearerToken(authorizationHeader?: string): string {
    if (!authorizationHeader) {
      throw createHttpError(HttpStatusConstants.UNAUTHORIZED, 'Missing Authorization header', {
        code: 'MISSING_AUTH_HEADER',
      });
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme !== AuthConstants.AUTH_HEADER_SCHEME || !token) {
      throw createHttpError(
        HttpStatusConstants.UNAUTHORIZED,
        'Authorization header must be Bearer token',
        {
          code: 'INVALID_AUTH_HEADER',
        }
      );
    }
    return token;
  }
}
