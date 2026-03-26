import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from './middleware';

/** Use (req, res, next) for every handler; last in chain is wrapped so errors go to error middleware via next(err). */
type RouteHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => void | Promise<void> | ReturnType<Response['json']>;

function wrapHandler(handler: RouteHandler) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const out = handler(req, res, next);
    if (out instanceof Promise) await out;
  });
}

function register(
  router: Router,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  ...handlers: RouteHandler[]
) {
  if (handlers.length === 0) return;
  const last = handlers.pop()!;
  const middlewares = handlers;
  (router[method] as (path: string, ...h: unknown[]) => void)(
    path,
    ...middlewares,
    wrapHandler(last)
  );
}

/**
 * Creates a small API surface: .get(path, ...middlewares, handler).
 * The last argument is always wrapped in asyncHandler so you don't write it in each route file.
 * Export api.router from your route file.
 */
export function createApi() {
  const router = Router();
  return {
    router,
    get: (path: string, ...handlers: RouteHandler[]) => register(router, 'get', path, ...handlers),
    post: (path: string, ...handlers: RouteHandler[]) =>
      register(router, 'post', path, ...handlers),
    put: (path: string, ...handlers: RouteHandler[]) => register(router, 'put', path, ...handlers),
    patch: (path: string, ...handlers: RouteHandler[]) =>
      register(router, 'patch', path, ...handlers),
    delete: (path: string, ...handlers: RouteHandler[]) =>
      register(router, 'delete', path, ...handlers),
  };
}
