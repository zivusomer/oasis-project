import { Request, Response, NextFunction } from 'express';
import { createApi } from '../api';

function getEcho(_req: Request, res: Response, _next?: NextFunction): void {
  res.json({ message: 'GET request with no message posted, echo nothing' });
}

function postEcho(req: Request, res: Response, _next?: NextFunction): void {
  const body = req.body as { message?: unknown };
  if (typeof body?.message !== 'string') {
    res.status(400).json({ error: 'Body must include a string "message" field' });
    return;
  }
  res.json({ message: body.message });
}

const api = createApi();
api.get('/', getEcho);
api.post('/', postEcho);

export const apiOverview = [
  { method: 'GET', path: '/', description: 'Echo GET (no body)' },
  { method: 'POST', path: '/', description: 'Echo message' },
];
export default api.router;
