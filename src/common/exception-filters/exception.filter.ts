import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class CustomWsExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: WsException | HttpException, host: ArgumentsHost) {
    // Emit error back to client
    const ctx = host.switchToWs();
    const socket = ctx.getClient<Socket>();
    const callback = host.getArgByIndex(2);

    if (callback && typeof callback === 'function') {
      // Ack callback (doesnt emit new event, but respond to original event)
      return callback(exception.message);
    } else {
      // Fallback: emit error event
      socket.emit('error', exception.message);
    }
  }
}
