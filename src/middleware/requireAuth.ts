import { Request, Response, NextFunction } from 'express';
import { createHttpError } from './errorHandler';
import { AuthService } from '../services/authService';

export class AuthGuard {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  public requireAuth(req: Request, _res: Response, next: NextFunction): void {
    let token = '';
    try {
      token = this.extractBearerToken(req.header('authorization'));
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
      throw createHttpError(401, 'Missing Authorization header', { code: 'MISSING_AUTH_HEADER' });
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw createHttpError(401, 'Authorization header must be Bearer token', {
        code: 'INVALID_AUTH_HEADER',
      });
    }
    return token;
  }
}
