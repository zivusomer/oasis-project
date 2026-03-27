import { Request, Response } from 'express';
import { loginWithJira } from '../services/authService';
import { createHttpError } from '../middleware/errorHandler';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, jiraApiToken } = req.body as { email?: string; jiraApiToken?: string };

  if (!email || !jiraApiToken) {
    throw createHttpError(400, 'email and jiraApiToken are required', {
      code: 'VALIDATION_ERROR',
    });
  }

  const result = await loginWithJira({ email, jiraApiToken });
  res.status(200).json(result);
}
