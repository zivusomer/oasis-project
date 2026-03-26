import { Request, Response, NextFunction } from 'express';

/**
 * Error middleware: handles errors passed via next(err) from any middleware or route handler.
 * Must be registered last (four-argument signature so Express treats it as error handler).
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
}
