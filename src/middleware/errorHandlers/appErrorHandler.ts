import { NextFunction, Request, Response } from 'express';
import { HttpStatusConstants } from '../../constants/HttpStatusConstants';
import { HttpErrorContract, HttpErrorOptions } from '../../interfaces/http';
import { AppHttpError } from './AppHttpError';

export class AppErrorHandler {
  private static readonly instance = new AppErrorHandler();

  public static createHttpError(
    statusCode: number,
    message: string,
    options?: HttpErrorOptions
  ): AppHttpError {
    return AppErrorHandler.instance.buildHttpError(statusCode, message, options);
  }

  public static errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    AppErrorHandler.instance.handle(error, req, res, next);
  }

  private buildHttpError(
    statusCode: number,
    message: string,
    options?: HttpErrorOptions
  ): AppHttpError {
    return new AppHttpError(statusCode, message, options);
  }

  private handle(error: Error, _req: Request, res: Response, _next: NextFunction): void {
    const statusCode = this.getStatusCode(error);
    const isProduction = process.env.NODE_ENV === 'production';
    const httpError = this.toHttpError(error);

    if (statusCode >= HttpStatusConstants.INTERNAL_SERVER_ERROR) {
      console.error(error);
    }

    const payload: Record<string, unknown> = {
      error:
        statusCode >= HttpStatusConstants.INTERNAL_SERVER_ERROR && isProduction
          ? 'Internal server error'
          : httpError.message,
      code: httpError.code,
      details: httpError.details,
    };

    if (!isProduction) {
      payload.stack = httpError.stack;
    }

    res.status(statusCode).json(payload);
  }

  private getStatusCode(error: Error): number {
    const httpError = this.toHttpError(error);
    if (
      typeof httpError.statusCode === 'number' &&
      httpError.statusCode >= HttpStatusConstants.BAD_REQUEST &&
      httpError.statusCode <= 599
    ) {
      return httpError.statusCode;
    }
    return HttpStatusConstants.INTERNAL_SERVER_ERROR;
  }

  private toHttpError(error: Error): HttpErrorContract {
    if (error instanceof AppHttpError) {
      return error;
    }
    const dynamicStatusCode = Reflect.get(error, 'statusCode');
    const dynamicCode = Reflect.get(error, 'code');
    const dynamicDetails = Reflect.get(error, 'details');

    const fallbackError = new AppHttpError(
      HttpStatusConstants.INTERNAL_SERVER_ERROR,
      error.message || 'Unexpected error'
    );
    if (typeof dynamicStatusCode === 'number') {
      fallbackError.statusCode = dynamicStatusCode;
    }
    if (typeof dynamicCode === 'string') {
      fallbackError.code = dynamicCode;
    }
    fallbackError.details = dynamicDetails;
    return fallbackError;
  }
}
