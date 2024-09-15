import {
  ChatInboxDto,
  DeleteMessageRequestDto,
  EditMessageRequestDto,
  MessageDto,
  ReadChatRequestDto,
  SendMessageRequestDto,
} from './dto';
import { PrivateChat, PrivateMessage } from './entities';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  CursorPaginationRequestQuery,
  CursorPaginationResponseMetaDto,
  ResponseFactory,
} from 'src/common/dto';
import { User } from 'src/users/entities';
import { DataSource, In, IsNull, Not } from 'typeorm';

@Injectable()
export class ChatsService {
  constructor(private readonly dataSource: DataSource) {}

  getCurrentOtherUserId(
    currentUserId: string,
    randomUserId1: string,
    randomUserId2: string,
  ) {
    if (randomUserId1 === currentUserId) {
      return {
        currentUserId,
        otherUserId: randomUserId2,
      };
    }

    return {
      currentUserId,
      otherUserId: randomUserId1,
    };
  }

  getUser1User2Id(randomUserId1: string, randomUserId2: string) {
    if (randomUserId1 < randomUserId2) {
      return {
        user1Id: randomUserId1,
        user2Id: randomUserId2,
      };
    } else {
      return {
        user1Id: randomUserId2,
        user2Id: randomUserId1,
      };
    }
  }

  async saveMessage(
    body: SendMessageRequestDto,
    currentUserId: string,
  ): Promise<{ newMessage: PrivateMessage; privateChat: PrivateChat }> {
    // Check if user is authorized
    const { isAuthorized, privateChat } = await this.canUserAccessPrivateChat(
      currentUserId,
      body.chatId,
    );

    if (!isAuthorized) {
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
    }

    // Save to database
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    const newMessage = await privateMessageRepository.save({
      content: body.message,
      senderId: currentUserId,
      privateChatId: privateChat.id,
    });

    return { newMessage, privateChat };
  }

  async editMessage(
    body: EditMessageRequestDto,
    currentUserId: string,
  ): Promise<{ editedMessage: PrivateMessage }> {
    // Check if user is authorized
    const { isAuthorized, privateMessage } = await this.canUserAccessMessage(
      currentUserId,
      body.messageId,
    );
    if (!isAuthorized) {
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
    }

    // Save to database
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    privateMessage.content = body.message;
    privateMessage.editedAt = new Date();

    const editedMessage = await privateMessageRepository.save(privateMessage);

    return { editedMessage };
  }

  async deleteMessage(
    body: DeleteMessageRequestDto,
    currentUserId: string,
  ): Promise<{ deletedMessage: PrivateMessage }> {
    // Check if user is authorized
    const { isAuthorized, privateMessage } = await this.canUserAccessMessage(
      currentUserId,
      body.messageId,
    );
    if (!isAuthorized) {
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
    }

    // Delete from database
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    privateMessage.deletedAt = new Date();
    const deletedMessage = await privateMessageRepository.save(privateMessage);

    return {
      deletedMessage,
    };
  }

  async readChat(body: ReadChatRequestDto, currentUserId: string) {
    // Check if user is authorized
    const { isAuthorized, privateChat } = await this.canUserAccessPrivateChat(
      currentUserId,
      body.chatId,
    );

    if (!isAuthorized) {
      throw new WsException(
        ResponseFactory.createErrorResponse('Unauthorized access'),
      );
    }

    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    // Update read_at
    const unreadPrivateMessages = await privateMessageRepository.find({
      where: {
        privateChatId: body.chatId,
        senderId: Not(currentUserId),
        readAt: IsNull(),
      },
      withDeleted: true,
    });

    unreadPrivateMessages.forEach((unreadPrivateMessage) => {
      unreadPrivateMessage.readAt = new Date();
    });

    const updatedPrivateMessages = await privateMessageRepository.save(
      unreadPrivateMessages,
    );

    return {
      readMessages: updatedPrivateMessages,
      privateChat,
    };
  }

  async canUserAccessMessage(
    currentUserId: string,
    messageId: string,
  ): Promise<
    | {
        isAuthorized: true;
        privateMessage: PrivateMessage;
      }
    | { isAuthorized: false; privateMessage: null }
  > {
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    try {
      const privateMessage = await privateMessageRepository.findOne({
        where: [
          {
            id: messageId,
            senderId: currentUserId, // only sender can mutate message
            deletedAt: IsNull(), // cannot mutate deleted message
            privateChat: {
              user1Id: currentUserId,
            },
          },
          {
            id: messageId,
            senderId: currentUserId, // only sender can mutate message
            deletedAt: IsNull(), // cannot mutate deleted message
            privateChat: {
              user2Id: currentUserId,
            },
          },
        ],
      });

      if (!privateMessage) {
        return {
          isAuthorized: false,
          privateMessage: null,
        };
      }

      return {
        isAuthorized: true,
        privateMessage,
      };
    } catch (error) {
      throw new WsException('Failed to check message access: ' + error.message);
    }
  }

  async canUserAccessPrivateChat(
    currentUserId: string,
    privateChatId: string,
  ): Promise<
    | {
        isAuthorized: true;
        privateChat: PrivateChat;
      }
    | { isAuthorized: false; privateChat: null }
  > {
    const privateChatRepository = this.dataSource.getRepository(PrivateChat);

    try {
      const privateChat = await privateChatRepository.findOne({
        where: [
          {
            id: privateChatId,
            user1Id: currentUserId,
          },
          {
            id: privateChatId,
            user2Id: currentUserId,
          },
        ],
      });

      if (!privateChat) {
        return {
          isAuthorized: false,
          privateChat: null,
        };
      }

      return {
        isAuthorized: true,
        privateChat,
      };
    } catch (error) {
      throw new WsException(
        'Failed to check private chat access: ' + error.message,
      );
    }
  }

  async canUserAccessPrivateChats(
    currentUserId: string,
    privateChatIds: string[],
  ): Promise<{
    isAuthorized: boolean;
    privateChats: PrivateChat[];
  }> {
    const privateChatRepository = this.dataSource.getRepository(PrivateChat);

    try {
      const privateChats = await privateChatRepository.find({
        where: [
          {
            id: In(privateChatIds), // And
            user1Id: currentUserId,
          },
          // Or
          {
            id: In(privateChatIds), // And
            user2Id: currentUserId,
          },
        ],
      });

      const isAuthorized = privateChats.length === privateChatIds.length;

      if (!isAuthorized) {
        return {
          isAuthorized,
          privateChats: [],
        };
      }

      return {
        isAuthorized,
        privateChats,
      };
    } catch (error) {
      throw new WsException(
        'Failed to check private chat access: ' + error.message,
      );
    }
  }

  async getPrivateChatInboxes(
    currentUserId: string,
    title: string | undefined,
    pagination: CursorPaginationRequestQuery,
  ): Promise<{
    privateChatInboxesDto: ChatInboxDto[];
    metaDto: CursorPaginationResponseMetaDto;
  }> {
    const entityManager = this.dataSource.manager;

    const result = await entityManager.query<any[]>(
      `
        WITH inbox_unread_count AS (
          SELECT
            pc.id as "chatId",
            COUNT(*) as "unreadCount"
          FROM
            private_chats pc
            INNER JOIN private_messages pm ON pc.id = pm.private_chat_id
          WHERE
            (pc.user1_id = $1::uuid OR pc.user2_id = $1::uuid) AND
            (pm.read_at IS NULL AND pm.sender_id <> $1::uuid)
          GROUP BY
            pc.id
        ),
        inbox_sorted AS (
          SELECT
            pc.id as "chatId",
            CASE
              WHEN u1.id = $1::uuid THEN
                u2.username
              ELSE
                u1.username
            END as "title",
            CASE
              WHEN u1.id = $1::uuid THEN
                u2.avatar_url
              ELSE
                u1.avatar_url
            END as "avatarUrl",
            json_build_object(
              'messageId', pm.id,
              'content', pm.content,
              'createdAt', pm.created_at,
              'deletedAt', pm.deleted_at
            ) as "latestMessage",
            ROW_NUMBER() OVER (ORDER BY pm.created_at DESC, pc.id ASC) as "rn"
          FROM
            private_chats pc
            LEFT JOIN users u1 ON pc.user1_id = u1.id
            LEFT JOIN users u2 ON pc.user2_id = u2.id
            INNER JOIN private_messages pm ON (pc.id = pm.private_chat_id AND pm.id = (SELECT id FROM private_messages WHERE private_chat_id = pc.id ORDER BY created_at DESC LIMIT 1))
          WHERE
            (pc.user1_id = $1::uuid OR pc.user2_id = $1::uuid) AND
            ($2::varchar IS NULL OR (
              SELECT
                CASE WHEN u1.id = $1::uuid THEN
                  u2.username
                ELSE
                  u1.username
                END
            ) ILIKE '%' || $2::varchar || '%')
        ),
        current_cursor AS (
          SELECT
            CASE WHEN $3::uuid IS NULL THEN 
              1
            ELSE 
              COALESCE(
                (SELECT inbox_sorted.rn FROM inbox_sorted WHERE inbox_sorted."chatId" = $3::uuid),
                1
              )
            END as rn
        )
        SELECT
          inbox_sorted."chatId",
          inbox_sorted."title",
          inbox_sorted."avatarUrl",
          inbox_sorted."latestMessage",
          COALESCE(inbox_unread_count."unreadCount", 0) as "unreadCount"
        FROM
          inbox_sorted
          LEFT JOIN inbox_unread_count ON inbox_sorted."chatId" = inbox_unread_count."chatId"
          LEFT JOIN current_cursor ON true
        WHERE
          inbox_sorted.rn >= current_cursor.rn
        ORDER BY
          inbox_sorted.rn ASC
        LIMIT
          $4::int + 1
      `,
      [currentUserId, title, pagination.cursor, pagination.limit],
    );

    // Parse into inbox
    const privateChatInboxesDto = result.map<ChatInboxDto>((row) => ({
      chatId: String(row.chatId),
      title: String(row.title),
      avatarUrl: row.avatarUrl ? String(row.avatarUrl) : null,
      unreadCount: Number(row.unreadCount),
      latestMessage: {
        messageId: String(row.latestMessage.messageId),
        content: row.latestMessage.deletedAt
          ? null
          : String(row.latestMessage.content),
        createdAt: new Date(row.latestMessage.createdAt),
        deletedAt: row.latestMessage.deletedAt
          ? new Date(row.latestMessage.deletedAt)
          : null,
      },
    }));

    // Slice the result
    const metaDto: CursorPaginationResponseMetaDto = {
      cursor: pagination.cursor,
      limit: pagination.limit,
      nextCursor: null,
    };

    if (privateChatInboxesDto.length > pagination.limit) {
      const nextPrivateChatInbox = privateChatInboxesDto.pop();
      if (nextPrivateChatInbox) {
        metaDto.nextCursor = nextPrivateChatInbox.chatId;
      }
    }

    return {
      privateChatInboxesDto,
      metaDto,
    };
  }

  // Get privat chat message from latest to oldest
  // Note: read update is done in the websocket hanlder, not http request
  async getPrivateChatMessage(
    currentUserId: string,
    privateChatId: string,
    pagination: CursorPaginationRequestQuery,
  ): Promise<{
    messagesDto: MessageDto[];
    metaDto: CursorPaginationResponseMetaDto;
  }> {
    // Check if user is authorized
    const { isAuthorized } = await this.canUserAccessPrivateChat(
      currentUserId,
      privateChatId,
    );
    if (!isAuthorized) {
      throw new BadRequestException('Unauthorized access');
    }

    // Get paginated messages
    const entityManager = this.dataSource.manager;

    const result = await entityManager.query<any[]>(
      `
        WITH messages_sorted AS (
          SELECT
            pm.id as "messageId",
            pm.private_chat_id as "chatId",
            pm.content as "content",
            pm.edited_at as "editedAt",
            pm.sender_id as "senderId",
            pm.read_at as "readAt",
            pm.created_at as "createdAt",
            pm.deleted_at as "deletedAt",
            ROW_NUMBER() OVER (ORDER BY pm.created_at DESC, pm.id ASC) as "rn"
          FROM
            private_messages pm
          WHERE
            pm.private_chat_id = $1::uuid
        ),
        current_cursor AS (
          SELECT
            CASE WHEN $2::uuid IS NULL THEN 
              1
            ELSE 
              COALESCE(
                (SELECT messages_sorted.rn FROM messages_sorted WHERE messages_sorted."messageId" = $2::uuid),
                1
              )
            END as rn
        )
        SELECT
          messages_sorted."messageId",
          messages_sorted."chatId",
          messages_sorted."content",
          messages_sorted."editedAt",
          messages_sorted."senderId",
          messages_sorted."readAt",
          messages_sorted."createdAt",
          messages_sorted."deletedAt"
        FROM
          messages_sorted
          LEFT JOIN current_cursor ON true
        WHERE
          messages_sorted.rn >= current_cursor.rn
        ORDER BY
          messages_sorted.rn ASC
        LIMIT
          $3::int + 1
      `,
      [privateChatId, pagination.cursor, pagination.limit],
    );

    // Map
    const messagesDto = result.map<MessageDto>((row) => ({
      messageId: String(row.messageId),
      chatId: String(row.chatId),
      content: row.content ? String(row.content) : null,
      editedAt: row.editedAt ? new Date(row.editedAt) : null,
      senderId: String(row.senderId),
      readAt: row.readAt ? new Date(row.readAt) : null,
      createdAt: new Date(row.createdAt),
      deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
    }));

    const metaDto: CursorPaginationResponseMetaDto = {
      cursor: pagination.cursor,
      limit: pagination.limit,
      nextCursor: null,
    };

    if (messagesDto.length > pagination.limit) {
      const nextMessage = messagesDto.pop();
      if (nextMessage) {
        metaDto.nextCursor = nextMessage.messageId;
      }
    }

    return {
      messagesDto,
      metaDto,
    };
  }

  async getPrivateChatInbox(
    currentUserId: string,
    targetUserId: string,
  ): Promise<ChatInboxDto | null> {
    const entityManager = this.dataSource.manager;

    // Find if chat exists between currentUserId & targetUserId
    const [result] = await entityManager.query<any>(
      `
        WITH chat_exists AS (
          SELECT
            pc.id as "chatId"
          FROM
            private_chats pc
          WHERE
            (pc.user1_id = $1::uuid AND pc.user2_id = $2::uuid) OR
            (pc.user1_id = $2::uuid AND pc.user2_id = $1::uuid)
        )
        SELECT
          CASE WHEN chat_exists."chatId" IS NULL THEN
            NULL
          ELSE (
            SELECT
              json_build_object(
                'chatId', pc.id,
                'title', (
                  CASE WHEN u1.id = $1::uuid THEN
                    u2.username
                  ELSE
                    u1.username
                  END
                ),
                'avatarUrl', (
                  CASE WHEN u1.id = $1::uuid THEN
                    u2.avatar_url
                  ELSE
                    u1.avatar_url
                  END
                ),
                'unreadCount', COALESCE(unread_count."unreadCount", 0),
                'latestMessage', (
                  json_build_object(
                    'messageId', pm.id,
                    'content', pm.content,
                    'createdAt', pm.created_at,
                    'deletedAt', pm.deleted_at
                  )
                )
              )
            FROM
              private_chats pc
              LEFT JOIN users u1 ON pc.user1_id = u1.id
              LEFT JOIN users u2 ON pc.user2_id = u2.id
              LEFT JOIN private_messages pm ON pc.id = pm.private_chat_id AND pm.id = (SELECT id FROM private_messages WHERE private_chat_id = pc.id ORDER BY created_at DESC LIMIT 1)
              LEFT JOIN (
                SELECT
                  pm.private_chat_id as "chatId",
                  COUNT(*) as "unreadCount"
                FROM
                  private_messages pm
                WHERE
                  pm.private_chat_id = chat_exists."chatId" AND
                  pm.sender_id = $2::uuid AND
                  pm.read_at IS NULL
                GROUP BY
                  pm.private_chat_id
              ) as unread_count ON pc.id = unread_count."chatId"
            WHERE
              pc.id = chat_exists."chatId"
          ) END as "chatInbox"
        FROM
          chat_exists
      `,
      [currentUserId, targetUserId],
    );

    if (!result) return null;

    const { chatInbox: rawChatInbox } = result;

    // Parse chat inbox
    const chatInboxDto: ChatInboxDto = {
      chatId: String(rawChatInbox.chatId),
      title: String(rawChatInbox.title),
      avatarUrl: rawChatInbox.avatarUrl ? String(rawChatInbox.avatarUrl) : null,
      unreadCount: Number(rawChatInbox.unreadCount),
      latestMessage: {
        messageId: String(rawChatInbox.latestMessage.messageId),
        content: rawChatInbox.latestMessage.deletedAt
          ? null
          : String(rawChatInbox.latestMessage.content),
        createdAt: new Date(rawChatInbox.latestMessage.createdAt),
        deletedAt: rawChatInbox.latestMessage.deletedAt
          ? new Date(rawChatInbox.latestMessage.deletedAt)
          : null,
      },
    };

    return chatInboxDto;
  }

  /**
   * Creates a new private chat if doesnt exists
   * Or returns existing private chat
   *
   * @param currentUserId
   * @param targetUserId
   * @returns
   */
  async createNewPrivateChat(
    currentUserId: string,
    targetUserId: string,
  ): Promise<ChatInboxDto> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        ResponseFactory.createErrorResponse('Cannot chat with yourself'),
      );
    }

    const { user1Id, user2Id } = this.getUser1User2Id(
      currentUserId,
      targetUserId,
    );

    // Validate and get target user data (for chat inbox) (current user already validated from auth)
    const userRepository = this.dataSource.getRepository(User);
    const targetUser = await userRepository.findOneBy({
      id: targetUserId,
    });
    if (!targetUser) {
      throw new NotFoundException(
        ResponseFactory.createErrorResponse("Target user doesn't exist"),
      );
    }

    // Create new chat
    const privateChatRepository = this.dataSource.getRepository(PrivateChat);
    const newPrivateChat = await privateChatRepository.save({
      user1Id: user1Id,
      user2Id: user2Id,
    });

    // Create new chat inbox
    const chatInboxDto: ChatInboxDto = {
      chatId: newPrivateChat.id,
      title: targetUser.username,
      avatarUrl: targetUser.avatarUrl,
      latestMessage: null,
      unreadCount: 0,
    };

    return chatInboxDto;
  }
}
