import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class ExceptionsFilter extends BaseExceptionFilter {
  private readonly logger: Logger = new Logger();

  private getHttpStatus(exception: unknown): HttpStatus {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  // Override the catch method to log the error
  public override catch(exception: unknown, host: ArgumentsHost): void {
    let args: unknown;
    super.catch(exception, host);
    // const req = host.switchToHttp().getRequest<Request>();
    // req.method, req.originalUrl...
    // args = req.body;

    const status = this.getHttpStatus(exception);
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      if (exception instanceof Error) {
        this.logger.error({ err: exception, args });
      } else {
        // Error Notifications
        this.logger.error('UnhandledException', exception);
      }
    }
  }
}
