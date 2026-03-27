import { Request, Response, NextFunction } from 'express';
import { createHttpError } from './errorHandler';
import { verifyAuthToken, type AuthenticatedUser } from '../services/authService';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const requestWithAuth = req as Request & { authUser?: AuthenticatedUser };
  let token: string;
  try {
    token = extractBearerToken(req.header('authorization'));
  } catch (error) {
    next(error);
    return;
  }

  verifyAuthToken(token)
    .then((user) => {
      requestWithAuth.authUser = user;
      next();
    })
    .catch(next);
}

function extractBearerToken(authorizationHeader: string | undefined): string {
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
