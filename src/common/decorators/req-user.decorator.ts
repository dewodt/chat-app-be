import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserPayload } from 'src/auth/interfaces';

export const ReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();

    return req.user;
  },
);
