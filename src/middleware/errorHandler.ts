import { ErrorRequestHandler } from 'express';

type HttpErrorShape = Error & {
  statusCode?: number;
  code?: string;
  details?: unknown;
};

export function createHttpError(
  statusCode: number,
  message: string,
  options?: { code?: string; details?: unknown }
): HttpErrorShape {
  const error = new Error(message) as HttpErrorShape;
  error.statusCode = statusCode;
  error.code = options?.code;
  error.details = options?.details;
  return error;
}

function getStatusCode(error: HttpErrorShape): number {
  if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode <= 599) {
    return error.statusCode;
  }
  return 500;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const err = error as HttpErrorShape;
  const statusCode = getStatusCode(err);
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: statusCode >= 500 && isProduction ? 'Internal server error' : err.message,
    code: err.code,
    details: err.details,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
