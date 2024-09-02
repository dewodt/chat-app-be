import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Socket } from 'socket.io';
import { UserPayload } from 'src/auth/interfaces';

export const WsReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload | undefined => {
    const req = ctx.switchToWs().getClient<Socket>();

    return req.data.user;
  },
);

export const HttpReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();

    return req.user;
  },
);
