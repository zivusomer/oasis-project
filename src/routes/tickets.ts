import { Router, Request, Response } from 'express';
import { asyncRoute } from '../middleware/asyncRoute';
import { createTicket, getRecentTickets } from '../controllers/ticketsController';

const router = Router();

router.post(
  '/',
  asyncRoute(async (req: Request, res: Response) => createTicket(req, res))
);

router.get(
  '/recent',
  asyncRoute(async (req: Request, res: Response) => getRecentTickets(req, res))
);

export const apiOverview = [
  { method: 'POST', path: '/', description: 'Create ticket (placeholder)' },
  { method: 'GET', path: '/recent', description: 'Get recent tickets (placeholder)' },
];

export default router;
