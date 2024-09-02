import {
  DeleteMessageRequestDto,
  EditMessageRequestDto,
  SendMessageRequestDto,
  SendReadReceiptRequestDto,
} from './dto';
import { PrivateChat, PrivateMessage } from './entities';
import { BadRequestException, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { UserPayload } from 'src/auth/interfaces';
import { PaginationParams } from 'src/common/decorators';
import { MetaDto } from 'src/common/dto';
import { DataSource, In } from 'typeorm';

@Injectable()
export class ChatsService {
  constructor(private readonly dataSource: DataSource) {}

  async saveMessage(
    body: SendMessageRequestDto,
    reqUser: UserPayload,
  ): Promise<{ newMessage: PrivateMessage; privateChat: PrivateChat }> {
    // Check if user is authorized
    const { isAuthorized, privateChat } = await this.canUserAccessPrivateChat(
      reqUser.userId,
      body.chatId,
    );
    if (!isAuthorized) {
      throw new WsException('Unauthorized access');
    }

    // Save to database
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    const newMessage = privateMessageRepository.create({
      content: body.message,
      privateChat: privateChat,
      sender: reqUser,
    });

    const insertedMessage = await privateMessageRepository.save(newMessage);

    privateChat.otherUser =
      privateChat.user1.id === reqUser.userId
        ? privateChat.user2
        : privateChat.user1;

    return { newMessage: insertedMessage, privateChat: privateChat };
  }

  async editMessage(
    body: EditMessageRequestDto,
    reqUser: UserPayload,
  ): Promise<{ editedMessage: PrivateMessage; privateChat: PrivateChat }> {
    // Check if user is authorized
    const { isAuthorized, privateMessage, privateChat } =
      await this.canUserAccessMessage(reqUser.userId, body.messageId);
    if (!isAuthorized) {
      throw new WsException('Unauthorized access');
    }

    // Save to database
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    privateMessage.content = body.newMessage;
    privateMessage.editedAt = new Date();

    const editedMessage = await privateMessageRepository.save(privateMessage);

    privateChat.otherUser =
      reqUser.userId === privateChat.user1.id
        ? privateChat.user2
        : privateChat.user1;

    return { editedMessage, privateChat };
  }

  async deleteMessage(
    body: DeleteMessageRequestDto,
    reqUser: UserPayload,
  ): Promise<{ deletedMessage: PrivateMessage; privateChat: PrivateChat }> {
    // Check if user is authorized
    const { isAuthorized, privateMessage, privateChat } =
      await this.canUserAccessMessage(reqUser.userId, body.messageId);
    if (!isAuthorized) {
      throw new WsException('Unauthorized access');
    }

    // Delete from database
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    await privateMessageRepository.softDelete({ id: body.messageId });

    privateChat.otherUser =
      reqUser.userId === privateChat.user1.id
        ? privateChat.user2
        : privateChat.user1;

    return {
      deletedMessage: privateMessage,
      privateChat,
    };
  }

  async readMessages(body: SendReadReceiptRequestDto, reqUser: UserPayload) {
    // Check if user is authorized
    const { isAuthorized, privateMessages } =
      await this.canUserAccessPrivateMessages(reqUser.userId, body.messageIds);

    if (!isAuthorized) {
      throw new WsException('Unauthorized access');
    }

    // Check if messages are not read and the sender is not the current user
    const isValidRead = privateMessages.every(
      (privateMessage) =>
        !privateMessage.isRead && privateMessage.sender.id !== reqUser.userId,
    );
    if (!isValidRead) {
      throw new WsException(
        'Some messages are already read or your own message',
      );
    }

    // Update messages
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    privateMessages.forEach((privateMessage) => {
      privateMessage.isRead = true;
      privateMessage.readAt = new Date();
    });

    const updatedPrivateMessages =
      await privateMessageRepository.save(privateMessages);

    // Map messages by chat id
    const chatIdMessagesMap = new Map<string, PrivateMessage[]>();
    updatedPrivateMessages.forEach((privateMessage) => {
      const chatId = privateMessage.privateChat.id;
      const pm = chatIdMessagesMap.get(chatId);
      if (!pm) {
        chatIdMessagesMap.set(chatId, [privateMessage]);
      } else {
        pm.push(privateMessage);
      }
    });

    return {
      readMessages: privateMessages,
      chatIdMessagesMap,
    };
  }

  async canUserAccessMessage(
    currentUserId: string,
    messageId: string,
  ): Promise<
    | {
        isAuthorized: true;
        privateMessage: PrivateMessage;
        privateChat: PrivateChat;
      }
    | { isAuthorized: false; privateMessage: null; privateChat: null }
  > {
    const { isAuthorized, privateMessages } =
      await this.canUserAccessPrivateMessages(currentUserId, [messageId]);

    if (!isAuthorized) {
      return {
        isAuthorized: false,
        privateMessage: null,
        privateChat: null,
      };
    }

    const privateMessage = privateMessages[0];
    const privateChat = privateMessage.privateChat;

    return {
      isAuthorized: true,
      privateMessage,
      privateChat,
    };
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
    const { isAuthorized, privateChats } = await this.canUserAccessPrivateChats(
      currentUserId,
      [privateChatId],
    );

    if (!isAuthorized) {
      return {
        isAuthorized: false,
        privateChat: null,
      };
    }

    const privateChat = privateChats[0];

    return {
      isAuthorized: true,
      privateChat: privateChat,
    };
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
            user1: { id: currentUserId },
          },
          // Or
          {
            id: In(privateChatIds), // And
            user2: { id: currentUserId },
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

  async canUserAccessPrivateMessages(
    currentUserId: string,
    privateMessageIds: string[],
  ): Promise<
    | {
        isAuthorized: true;
        privateMessages: PrivateMessage[];
      }
    | {
        isAuthorized: false;
        privateMessages: null;
      }
  > {
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    try {
      const privateMessages = await privateMessageRepository.find({
        where: [
          {
            id: In(privateMessageIds),
            privateChat: {
              user1: { id: currentUserId },
            },
          },
          {
            id: In(privateMessageIds),
            privateChat: {
              user2: { id: currentUserId },
            },
          },
        ],
        relations: ['privateChat'],
      });

      const isAuthorized = privateMessages.length === privateMessageIds.length;

      // Check if some of the messages are not found or user is not part of the chat
      if (!isAuthorized) {
        return {
          isAuthorized,
          privateMessages: null,
        };
      }

      return {
        isAuthorized,
        privateMessages,
      };
    } catch (error) {
      throw new WsException(
        'Failed to check private message access: ' + error.message,
      );
    }
  }

  async getPrivateChatInbox(
    currentUserId: string,
    title: string | undefined,
    pagination: PaginationParams,
  ) {
    const privateChatRepository = this.dataSource.getRepository(PrivateChat);

    let queryBuilder = privateChatRepository
      .createQueryBuilder('privateChat')
      .where(
        '(privateChat.user1_id = :currentUserId OR privateChat.user2_id = :currentUserId)',
        { currentUserId },
      )
      .loadRelationCountAndMap(
        'privateChat.unreadCount',
        'privateChat.messages',
        'unreadCountPrivateMessage',
        (qb) =>
          qb.andWhere(
            '(unreadCountPrivateMessage.is_read = false AND unreadCountPrivateMessage.sender_id <> :currentUserId)',
            { currentUserId },
          ),
      )
      .leftJoinAndSelect('privateChat.user1', 'user1')
      .leftJoinAndSelect('privateChat.user2', 'user2')
      .withDeleted()
      .leftJoinAndMapOne(
        'privateChat.latestMessage',
        'privateChat.messages',
        'latestMessage',
        'latestMessage.private_chat_id = (SELECT private_chat_id FROM private_messages WHERE private_chat_id = privateChat.id ORDER BY created_at DESC LIMIT 1)',
      )
      .orderBy('latestMessage.createdAt', 'DESC');

    if (title) {
      queryBuilder = queryBuilder.andWhere(
        '((privateChat.user1_id <> :currentUserId AND user1.username ILIKE :title) OR (privateChat.user2_id <> :currentUserId AND user2.username ILIKE :title))',
        {
          currentUserId,
          title: `%${title}%`,
        },
      );
    }

    const allPrivateChats = await queryBuilder.getMany();

    // Must paginate manually becuase typeorm pagination is broken when using joins 💀
    // https://github.com/typeorm/typeorm/issues/4742
    const totalPage = Math.ceil(allPrivateChats.length / pagination.limit);
    const privateChats = allPrivateChats.slice(
      (pagination.page - 1) * pagination.limit,
      pagination.page * pagination.limit,
    );

    privateChats.forEach((privateChat) => {
      if (privateChat.user1.id !== currentUserId) {
        privateChat.otherUser = privateChat.user1;
      } else {
        privateChat.otherUser = privateChat.user2;
      }
    });

    const metaDto: MetaDto = {
      page: pagination.page,
      limit: pagination.limit,
      totalData: allPrivateChats.length,
      totalPage,
    };

    return {
      privateChats,
      metaDto,
    };
  }

  // Get privat chat message from latest to oldest
  async getPrivateChatMessage(
    currentUserId: string,
    privateChatId: string,
    pagination: PaginationParams,
  ) {
    // Check if user is authorized
    const { isAuthorized } = await this.canUserAccessPrivateChat(
      currentUserId,
      privateChatId,
    );
    if (!isAuthorized) {
      throw new BadRequestException('Unauthorized access');
    }

    // Get paginated messages
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    const [privateMessages, totalData] =
      await privateMessageRepository.findAndCount({
        where: {
          privateChat: { id: privateChatId },
        },
        order: {
          createdAt: 'DESC',
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });

    const totalPage = Math.ceil(totalData / pagination.limit);

    const metaDto: MetaDto = {
      page: pagination.page,
      limit: pagination.limit,
      totalData,
      totalPage,
    };

    // Note: read update is done in the websocket hanlder, not http request

    return { privateMessages, metaDto };
  }
}
