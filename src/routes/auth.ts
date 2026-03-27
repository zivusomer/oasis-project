import { Router, Request, Response } from 'express';
import { asyncRoute } from '../middleware/asyncRoute';
import { login } from '../controllers/authController';

const router = Router();

router.post(
  '/login',
  asyncRoute(async (req: Request, res: Response) => login(req, res))
);

export const apiOverview = [
  {
    method: 'POST',
    path: '/login',
    description: 'Login with Jira credentials (pending implementation)',
  },
];

export default router;
