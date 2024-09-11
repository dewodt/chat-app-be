import { ResponseFactory } from '../dto';
import {
  BadRequestException,
  Injectable,
  ValidationPipe,
  PipeTransform,
  ValidationError,
  ValidationPipeOptions,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

/**
 * Base validation pipe
 */
@Injectable()
export class BaseValidationPipe extends ValidationPipe {
  constructor(options: ValidationPipeOptions = {}) {
    super({
      ...options,
    });
  }

  protected getErrorMessages(errors: ValidationError[]) {
    const accumulateErrMessage: string[] = [];

    errors.forEach((err) => {
      const constraints = err.constraints;
      if (constraints) {
        accumulateErrMessage.push(Object.values(constraints).join(', '));
      } else {
        accumulateErrMessage.push(err.property + ' has an error field');
      }
    });

    return accumulateErrMessage.join(', ');
  }
}

/**
 * Custom validation pipe for http request
 */
@Injectable()
export class HttpValidationPipe extends BaseValidationPipe {
  constructor(options: ValidationPipeOptions = {}) {
    super({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const errorMessages = this.getErrorMessages(errors);

        throw new BadRequestException(
          ResponseFactory.createErrorResponse(errorMessages),
        );
      },
      ...options,
    });
  }
}

/**
 * Custom validation pipe for websocket request
 */
@Injectable()
export class WsValidationPipe
  extends BaseValidationPipe
  implements PipeTransform
{
  constructor(options: ValidationPipeOptions = {}) {
    super({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const errorMessages = this.getErrorMessages(errors);

        throw new WsException(
          ResponseFactory.createErrorResponse(errorMessages),
        );
      },
      ...options,
    });
  }
}
