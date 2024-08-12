import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type ReqUser = Express.User;

export const ReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReqUser | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();

    return req.user;
  },
);
