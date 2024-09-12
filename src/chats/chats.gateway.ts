import { ChatsService } from './chats.service';
import {
  ChatResponseFactory,
  DeleteMessageRequestDto,
  EditMessageRequestDto,
  JoinChatRequestDto,
  SendMessageRequestDto,
  ReadChatRequestDto,
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

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL,
    methods: 'GET,POST',
    credentials: true,
  },
})
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
      throw new WsException(
        ResponseFactory.createErrorResponse(
          'Unauthorized access: No token provided',
        ),
      );
    }

    // Validate jwt
    const userPayload = await this.authService.verifyJwt(authToken);
    if (!userPayload) {
      throw new WsException(
        ResponseFactory.createErrorResponse(
          'Unauthorized access: Invalid token',
        ),
      );
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

  @SubscribeMessage('joinChatRooms')
  async handleJoinChatRooms(
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
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
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
    const { newMessage, privateChat } = await this.chatService.saveMessage(
      body,
      reqUser.userId,
    );

    const { otherUser, currentUser } = this.chatService.differentiateUser(
      privateChat.user1,
      privateChat.user2,
      reqUser.userId,
    );

    // Get unread count for both users
    const [unreadCountCurrentUser, unreadCountOtherUser] = await Promise.all([
      this.chatService.getPrivateChatUnreadCount(
        privateChat.id,
        currentUser.id,
      ),
      this.chatService.getPrivateChatUnreadCount(privateChat.id, otherUser.id),
    ]);

    const privateChatCurrentUser = {
      ...privateChat,
      unreadCount: unreadCountCurrentUser,
    };
    const privateChatOtherUser = {
      ...privateChat,
      unreadCount: unreadCountOtherUser,
    };

    // Map to response
    const messageResponse = ChatResponseFactory.createMessage(newMessage);

    // Current user
    const chatInboxResponseToCurrentUser =
      ChatResponseFactory.createPrivateChatInbox(
        privateChatCurrentUser,
        currentUser.id,
      );

    const responseCurrentUser = ResponseFactory.createSuccessResponse(
      'Message sent',
      {
        message: messageResponse,
        chatInbox: chatInboxResponseToCurrentUser,
      },
    );

    // Other user
    const chatInboxResponseToOtherUser =
      ChatResponseFactory.createPrivateChatInbox(
        privateChatOtherUser,
        otherUser.id,
      );

    const responseOtherUser = ResponseFactory.createSuccessResponse(
      'Message received',
      {
        message: messageResponse,
        chatInbox: chatInboxResponseToOtherUser,
      },
    );

    const otherUserSockets = this.userSocketsMap.get(otherUser.id);
    if (otherUserSockets) {
      // Other user online
      otherUserSockets.forEach((socketId) => {
        // But socket id not in chat room
        if (!socket.rooms.has(socketId)) {
          const socketInstance = this.server.sockets.sockets.get(socketId);
          if (socketInstance) {
            socketInstance.join(privateChat.id);
          }
        }
      });
    }

    // Send message to other users except current socket id
    socket.to(body.chatId).emit('newMessage', responseOtherUser);

    return responseCurrentUser;
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: EditMessageRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Edit message
    const { editedMessage, privateChat } = await this.chatService.editMessage(
      body,
      reqUser.userId,
    );

    // Map to response
    const response = ResponseFactory.createSuccessResponse('Message edited', {
      chatId: privateChat.id,
      messageId: editedMessage.id,
      newMessage: editedMessage.content,
      editedAt: editedMessage.editedAt,
    });

    // Send edit message to other users
    socket.to(editedMessage.privateChat.id).emit('newEditMessage', response);

    return response;
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: DeleteMessageRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Delete message
    const { deletedMessage, privateChat } =
      await this.chatService.deleteMessage(body, reqUser.userId);

    // Map to response
    const response = ResponseFactory.createSuccessResponse('Message deleted', {
      chatId: privateChat.id,
      messageId: deletedMessage.id,
      deletedAt: deletedMessage.deletedAt,
    });

    // Send delete message to other users
    socket.to(deletedMessage.privateChat.id).emit('newDeleteMessage', response);

    return response;
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
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
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
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
    }

    // Send stop typing
    socket.to(body.chatId).emit('stopTyping', { userId: reqUser.userId });
  }

  @SubscribeMessage('readChat')
  async handleSendReadReceipt(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: ReadChatRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Send read receipt
    const { privateChat, readMessages } = await this.chatService.readChat(
      body,
      reqUser.userId,
    );

    // Send to other users
    socket.to(privateChat.id).emit('readReceipt', {
      messageIds: readMessages.map((message) => message.id),
    });

    return ResponseFactory.createSuccessResponse('Read receipt sent');
  }
}
