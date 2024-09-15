import { ChatsService } from './chats.service';
import {
  ChatResponseFactory,
  DeleteMessageRequestDto,
  EditMessageRequestDto,
  SendMessageRequestDto,
  ReadChatRequestDto,
  JoinChatRoomsRequestDto,
  SendStopTypingRequestDto,
  SendTypingRequestDto,
} from './dto';
import { GetStatusRequestDto, GetStatusResponseDto } from './dto/get-status';
import { STATUS } from './entities';
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

    // Notify online users
    const onlineUserIds = Array.from(new Set(this.userSocketsMap.keys()));
    const currentUserOnlineRooms =
      await this.chatService.getCurrentUserOnlineRoomIds(
        userPayload.userId,
        onlineUserIds,
      );
    const response = ResponseFactory.createSuccessResponseWithData(
      'User is now online',
      {
        userId: userPayload.userId,
      },
    );
    socket.to(currentUserOnlineRooms).emit('userOnline', response);

    console.log(
      `WS Client Connected (UserID: ${userPayload.userId} | SocketID: ${socket.id})`,
    );
  }

  async handleDisconnect(socket: Socket) {
    const reqUser = socket.data.user as UserPayload;

    const userSockets = this.userSocketsMap.get(reqUser.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        // empty
        this.userSocketsMap.delete(reqUser.userId);
      }
    }

    // Notify offline to other users
    const onlineUserIds = Array.from(new Set(this.userSocketsMap.keys()));
    const currentUserOnlineRooms =
      await this.chatService.getCurrentUserOnlineRoomIds(
        reqUser.userId,
        onlineUserIds,
      );
    const response = ResponseFactory.createSuccessResponseWithData(
      'User is now offline',
      {
        userId: reqUser.userId,
      },
    );
    socket.to(currentUserOnlineRooms).emit('userOffline', response);

    console.log(
      `WS Client Disconnected (UserID: ${reqUser.userId} | SocketID: ${socket.id})`,
    );
  }

  @SubscribeMessage('joinChatRooms')
  async handleJoinChatRooms(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: JoinChatRoomsRequestDto,
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

  @SubscribeMessage('getStatus')
  async handleGetStatus(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: GetStatusRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Check if user can get status
    const { isAuthorized, privateChat } =
      await this.chatService.canUserAccessPrivateChat(
        reqUser.userId,
        body.chatId,
      );

    if (!isAuthorized) {
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
    }

    const { otherUserId } = this.chatService.getCurrentOtherUserId(
      reqUser.userId,
      privateChat.user1Id,
      privateChat.user2Id,
    );

    const otherUserSockets = this.userSocketsMap.get(otherUserId);
    const otherUserStatus = otherUserSockets ? STATUS.ONLINE : STATUS.OFFLINE;

    // Map to response
    const responseData: GetStatusResponseDto = {
      chatId: body.chatId,
      status: otherUserStatus,
    };

    const response = ResponseFactory.createSuccessResponseWithData(
      'Status retrieved',
      responseData,
    );

    return response;
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

    const newMessageDto = ChatResponseFactory.createMessage(newMessage);

    const { currentUserId, otherUserId } =
      this.chatService.getCurrentOtherUserId(
        reqUser.userId,
        privateChat.user1Id,
        privateChat.user2Id,
      );

    const [currentUserChatInboxDto, otherUserChatInboxDto] = await Promise.all([
      this.chatService.getPrivateChatInbox(currentUserId, otherUserId),
      this.chatService.getPrivateChatInbox(otherUserId, currentUserId),
    ]);

    // Current user response data
    const currentUserResponse = ResponseFactory.createSuccessResponseWithData(
      'Message sent',
      {
        message: newMessageDto,
        chatInbox: currentUserChatInboxDto,
      },
    );

    // Other user response data
    const otherUserResponse = ResponseFactory.createSuccessResponseWithData(
      'Message received',
      {
        message: newMessageDto,
        chatInbox: otherUserChatInboxDto,
      },
    );

    const otherUserSockets = this.userSocketsMap.get(otherUserId);
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
    socket.to(body.chatId).emit('newMessage', otherUserResponse);

    return currentUserResponse;
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: EditMessageRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Edit message
    const { editedMessage } = await this.chatService.editMessage(
      body,
      reqUser.userId,
    );

    // Map to response
    const responseData = {
      chatId: editedMessage.privateChatId,
      messageId: editedMessage.id,
      newMessage: editedMessage.content,
      editedAt: editedMessage.editedAt,
    };

    const otherUserResponse = ResponseFactory.createSuccessResponseWithData(
      'New edit message received',
      responseData,
    );

    const currentUserResponse = ResponseFactory.createSuccessResponseWithData(
      'Message edited successfully',
      responseData,
    );

    // Send edit message to other users
    socket
      .to(editedMessage.privateChatId)
      .emit('newEditMessage', otherUserResponse);

    return currentUserResponse;
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: DeleteMessageRequestDto,
    @WsReqUser() reqUser: UserPayload,
  ) {
    // Validate sender & Delete message
    const { deletedMessage } = await this.chatService.deleteMessage(
      body,
      reqUser.userId,
    );

    // Map to response
    const responseData = {
      chatId: deletedMessage.privateChatId,
      messageId: deletedMessage.id,
      deletedAt: deletedMessage.deletedAt,
    };

    const otherUserResponse = ResponseFactory.createSuccessResponseWithData(
      'New delete message received',
      responseData,
    );

    const currentUserResponse = ResponseFactory.createSuccessResponseWithData(
      'Message deleted successfully',
      responseData,
    );

    // Send delete message to other users
    socket
      .to(deletedMessage.privateChatId)
      .emit('newDeleteMessage', otherUserResponse);

    return currentUserResponse;
  }

  @SubscribeMessage('sendTyping')
  async handleSendTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: SendTypingRequestDto,
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

    // Map response other user
    const otherUserResponse = ResponseFactory.createSuccessResponseWithData(
      'User is typing',
      { chatId: body.chatId, userId: reqUser.userId },
    );

    socket.to(body.chatId).emit('typing', otherUserResponse);

    // Map response current user
    const currentUserResponse =
      ResponseFactory.createSuccessResponse('Typing sent');

    return currentUserResponse;
  }

  @SubscribeMessage('sendStopTyping')
  async handleSendStopTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: SendStopTypingRequestDto,
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

    // Map response other user
    const otherUserResponse = ResponseFactory.createSuccessResponseWithData(
      'User stopped typing',
      { userId: reqUser.userId },
    );

    socket.to(body.chatId).emit('stopTyping', otherUserResponse);

    // Map response current user
    const currentUserResponse =
      ResponseFactory.createSuccessResponse('Stop typing sent');

    return currentUserResponse;
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

    const responseData = {
      chatId: privateChat.id,
      messages: readMessages.map((msg) => ({
        messageId: msg.id,
        readAt: msg.readAt,
      })),
    };

    const otherUserResponse = ResponseFactory.createSuccessResponseWithData(
      'New read receipt received',
      responseData,
    );

    const currentUserResponse = ResponseFactory.createSuccessResponseWithData(
      'Read receipt sent',
      responseData,
    );

    // Send to other users
    socket.to(privateChat.id).emit('newReadChat', otherUserResponse);

    return currentUserResponse;
  }
}
