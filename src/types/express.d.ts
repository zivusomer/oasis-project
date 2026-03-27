import { AuthenticatedUser } from '../interfaces/auth';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export {};
