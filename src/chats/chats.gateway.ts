import { ChatsService } from './chats.service';
import {
  ChatResponseFactory,
  DeleteMessageRequestDto,
  EditMessageRequestDto,
  JoinChatRequestDto,
  SendMessageRequestDto,
  SendReadReceiptRequestDto,
} from './dto';
import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { NestGateway } from '@nestjs/websockets/interfaces/nest-gateway.interface';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { WsJwtGuard } from 'src/auth/guards';
import { UserPayload } from 'src/auth/interfaces';
import { WsReqUser } from 'src/common/decorators/req-user.decorator';
import { ResponseFactory } from 'src/common/dto';
import { CustomWsExceptionsFilter } from 'src/common/exception-filters';
import { WsValidationPipe } from 'src/common/pipes/validation.pipe';

@WebSocketGateway()
@UseFilters(CustomWsExceptionsFilter)
@UsePipes(WsValidationPipe)
@UseGuards(WsJwtGuard)
export class ChatsGateway implements NestGateway {
  constructor(
    private readonly authService: AuthService,
    private readonly chatService: ChatsService,
  ) {}
  // socket.io server
  @WebSocketServer() server: Server;

  // Map of user id and their sockets id
  private userSocketsMap = new Map<string, Set<string>>();

  afterInit() {
    console.log('WS Gateway initialized');
  }

  async handleConnection(socket: Socket) {
    // Validate socket connection
    const authToken = this.authService.wsExtractJwtToken(socket);
    if (!authToken) {
      throw new WsException('Unauthorized access: No token provided');
    }

    // Validate jwt
    const userPayload = await this.authService.verifyJwt(authToken);
    if (!userPayload) {
      throw new WsException('Unauthorized access: Invalid token');
    }

    // Attach user payload to socket
    socket.data.user = userPayload;

    const userSockets = this.userSocketsMap.get(userPayload.userId);
    if (userSockets) {
      userSockets.add(socket.id);
    } else {
      this.userSocketsMap.set(userPayload.userId, new Set([socket.id]));
    }

    console.log(
      `WS Client Connected (UserID: ${userPayload.userId} | SocketID: ${socket.id})`,
    );
  }

  handleDisconnect(socket: Socket) {
    const reqUser = socket.data.user as UserPayload;

    const userSockets = this.userSocketsMap.get(reqUser.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        // empty
        this.userSocketsMap.delete(reqUser.userId);
      }
    }

    console.log(
      `WS Client Disconnected (UserID: ${reqUser.userId} | SocketID: ${socket.id})`,
    );
  }

  // @SubscribeMessage('message')
  // handleMessage(@MessageBody() data: string): string {
  //   throw new WsException('Unauthorized access');

  //   return data;
  // }

  @SubscribeMessage('joinChatRooms')
  async handleJoinChatRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: JoinChatRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Check if user can join chat room
    const { isAuthorized } = await this.chatService.canUserAccessPrivateChats(
      reqUser.userId,
      body.chatIds,
    );
    if (!isAuthorized) {
      throw new WsException('Unauthorized access');
    }

    // Join chat room
    socket.join(body.chatIds);

    return ResponseFactory.createSuccessResponse('Joined chat room');
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: SendMessageRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Save message
    const { newMessage } = await this.chatService.saveMessage(body, reqUser);

    // Map to response
    const messageResponse = ChatResponseFactory.createMessage(newMessage);

    const otherUserSockets = this.userSocketsMap.get(
      newMessage.privateChat.otherUser.id,
    );

    if (otherUserSockets) {
      // User online
      otherUserSockets.forEach((socketId) => {
        // But socket id not in chat room
        if (!socket.rooms.has(socketId)) {
          socket.join(socketId);
        }
      });
    }

    // Send message to other users except current socket id
    socket.to(body.chatId).emit('newMessage', messageResponse);

    return ResponseFactory.createSuccessResponse('Message sent');
  }

  @SubscribeMessage('handleEditMessage')
  async handleEditMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: EditMessageRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Edit message
    const { editedMessage } = await this.chatService.editMessage(body, reqUser);

    // Map to response
    const messageResponse = ChatResponseFactory.createMessage(editedMessage);

    // Send edit message to other users
    socket
      .to(editedMessage.privateChat.id)
      .emit('editMessage', messageResponse);

    return ResponseFactory.createSuccessResponse('Message edited');
  }

  @SubscribeMessage('sendDeleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: DeleteMessageRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Delete message
    const { deletedMessage } = await this.chatService.deleteMessage(
      body,
      reqUser,
    );

    // Map to response
    const messageResponse = ChatResponseFactory.createMessage(deletedMessage);

    // Send delete message to other users
    socket
      .to(deletedMessage.privateChat.id)
      .emit('deleteMessage', messageResponse);

    return ResponseFactory.createSuccessResponse('Message deleted');
  }

  @SubscribeMessage('sendTyping')
  async handleSendTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: any,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Check if user is authorized
    const { isAuthorized } = await this.chatService.canUserAccessPrivateChat(
      reqUser.userId,
      body.chatId,
    );
    if (!isAuthorized) {
      throw new WsException('Unauthorized access');
    }

    // Send typing
    socket.to(body.chatId).emit('typing', { userId: reqUser.userId });
  }

  @SubscribeMessage('sendStopTyping')
  async handleSendStopTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: any,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Check if user is authorized
    const { isAuthorized } = await this.chatService.canUserAccessPrivateChat(
      reqUser.userId,
      body.chatId,
    );
    if (!isAuthorized) {
      throw new WsException('Unauthorized access');
    }

    // Send stop typing
    socket.to(body.chatId).emit('stopTyping', { userId: reqUser.userId });
  }

  @SubscribeMessage('sendReadReceipt')
  async handleSendReadReceipt(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: SendReadReceiptRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Send read receipt
    const { chatIdMessagesMap } = await this.chatService.readMessages(
      body,
      reqUser,
    );

    // Send to other users
    for (const [chatId, messages] of chatIdMessagesMap.entries()) {
      const messageIds = messages.map((message) => message.id);
      socket.to(chatId).emit('readReceipt', { messageIds });
    }

    return ResponseFactory.createSuccessResponse('Read receipt sent');
  }
}
