import { PrivateChat } from './entities';
import { Injectable } from '@nestjs/common';
import { PaginationParams } from 'src/common/decorators';
import { MetaDto } from 'src/common/dto';
import { DataSource } from 'typeorm';

@Injectable()
export class ChatsService {
  constructor(private readonly dataSource: DataSource) {}

  // userId1 < userId2
  determineUserId(randomUserId1: string, randomUserId2: string) {
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
        privateChat.toUser = privateChat.user1;
      } else {
        privateChat.toUser = privateChat.user2;
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
