import {
  DeleteMessageRequestDto,
  EditMessageRequestDto,
  SendMessageRequestDto,
} from './dto';
import { PrivateChat, PrivateMessage } from './entities';
import { Injectable } from '@nestjs/common';
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
    const privateMessageRepository =
      this.dataSource.getRepository(PrivateMessage);

    try {
      const privateMessage = await privateMessageRepository.findOne({
        where: { id: messageId },
        relations: ['privateChat'],
      });

      // Not found id
      if (!privateMessage) {
        return {
          isAuthorized: false,
          privateMessage: null,
          privateChat: null,
        };
      }
      // Check if user is not part of the chat
      const privateChat = privateMessage.privateChat;
      if (
        privateChat.user1.id !== currentUserId &&
        privateChat.user2.id !== currentUserId
      ) {
        return {
          isAuthorized: false,
          privateMessage: null,
          privateChat: null,
        };
      }

      return {
        isAuthorized: true,
        privateMessage,
        privateChat,
      };
    } catch (error) {
      throw new WsException('Failed to check message access');
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
      const privateChat = await privateChatRepository
        .createQueryBuilder('privateChat')
        .where(
          '(privateChat.user1_id = :currentUserId OR privateChat.user2_id = :currentUserId)',
          { currentUserId },
        )
        .andWhere('(privateChat.id = :privateChatId)', { privateChatId })
        .getOne();

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
      throw new WsException('Failed to check private chat access');
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

    // console.log('lol' + privateChatIds);

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

    const sql = queryBuilder.getSql();
    console.log(sql);

    const allPrivateChats = await queryBuilder.getMany();

    // Must paginate manually becuase typeorm pagination is broken when using joins 💀
    // https://github.com/typeorm/typeorm/issues/4742
    const totalPage = Math.ceil(allPrivateChats.length / pagination.limit);
    if (pagination.page > totalPage) {
      pagination.page = totalPage;
    }
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
}
