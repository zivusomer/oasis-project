import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface AsyncHandler {
  (req: Request, res: Response, next: NextFunction): Promise<unknown>;
}

export class AsyncRouteAdapter {
  public wrap(handler: AsyncHandler): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  }
}

const adapter = new AsyncRouteAdapter();
export const asyncRoute = adapter.wrap.bind(adapter);
