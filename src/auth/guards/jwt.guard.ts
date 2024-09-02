import { AuthService } from '../auth.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { Request } from 'express';
import { Socket } from 'socket.io';
import { PUBLIC_KEY } from 'src/common/decorators';
import { ResponseFactory } from 'src/common/dto';

@Injectable()
export class HttpJwtGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get request
    const request = context.switchToHttp().getRequest<Request>();

    // Extract token
    const token = this.authService.httpExtractJwtToken(request);
    if (!token) {
      if (isPublic) {
        return true;
      } else {
        throw new UnauthorizedException(
          'Unauthorized access: No token provided',
        );
      }
    }

    // Validate jwt
    const userPayload = await this.authService.verifyJwt(token);
    if (!userPayload) {
      if (isPublic) {
        return true;
      } else {
        throw new UnauthorizedException('Unauthorized access: Invalid token');
      }
    }

    request.user = userPayload;

    return true;
  }
}

/**
 * Note: UseGuards(WsJwtGuard) only works for validating event handlers
 * Must manually validate in handleConnection again.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get auth token
    const socket = context.switchToWs().getClient<Socket>();

    // Extract token
    const token = this.authService.wsExtractJwtToken(socket);
    if (!token) {
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access: No token'),
      );
    }

    // Validate jwt
    const userPayload = await this.authService.verifyJwt(token);
    if (!userPayload) {
      throw new WsException(
        ResponseFactory.createErrorResponse(
          'Unauthorized access: Invalid token',
        ),
      );
    }

    // Bind user payload to socket
    socket.data.user = userPayload;

    return true;
  }
}
