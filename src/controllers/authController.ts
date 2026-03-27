import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { createHttpError } from '../middleware/errorHandler';
import { LoginRequestBody } from '../interfaces/auth';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  public async login(req: Request<object, object, LoginRequestBody>, res: Response): Promise<void> {
    const { email, jiraApiToken } = req.body;
    if (!email || !jiraApiToken) {
      throw createHttpError(400, 'email and jiraApiToken are required', {
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await this.authService.loginWithJira({ email, jiraApiToken });
    res.status(200).json(result);
  }
}
