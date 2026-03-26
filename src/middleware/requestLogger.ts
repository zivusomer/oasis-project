import { Request, Response, NextFunction } from 'express';

/**
 * Logs each API request. Run as first middleware in the chain.
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
}
