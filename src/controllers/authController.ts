import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { createHttpError } from '../middleware/errorHandler';
import { JiraLoginInput, LoginRequestBody } from '../interfaces/auth';

export class AuthController {
  constructor(private authService: AuthService) {}

  public async login(req: Request<object, object, LoginRequestBody>, res: Response): Promise<void> {
    const loginInput: JiraLoginInput = {
      email: req.body.email || '',
      jiraApiToken: req.body.jiraApiToken || '',
    };
    if (!loginInput.email || !loginInput.jiraApiToken) {
      throw createHttpError(400, 'email and jiraApiToken are required', {
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await this.authService.loginWithJira(loginInput);
    res.status(200).json(result);
  }
}
