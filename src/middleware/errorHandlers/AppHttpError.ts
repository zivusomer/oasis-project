import { HttpErrorContract, HttpErrorOptions } from '../../interfaces/http';

export class AppHttpError extends Error implements HttpErrorContract {
  statusCode?: number;
  code?: string;
  details?: unknown;

  constructor(statusCode: number, message: string, options?: HttpErrorOptions) {
    super(message);
    this.statusCode = statusCode;
    this.code = options?.code;
    this.details = options?.details;
  }
}
