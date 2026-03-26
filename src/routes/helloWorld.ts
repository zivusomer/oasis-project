import { Request, Response, NextFunction } from 'express';
import { createApi } from '../api';

function getHelloWorld(_req: Request, res: Response, _next?: NextFunction): void {
  res.json({ message: 'Hello, World!' });
}

const api = createApi();
api.get('/', getHelloWorld);

export const apiOverview = [{ method: 'GET', path: '/', description: 'Hello world' }];
export default api.router;
