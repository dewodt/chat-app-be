import {
  UpdateProfileDataRequestDto,
  UploadProfilePictureRequestDto,
} from './dto';
import { User } from './entities';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { BucketService } from 'src/bucket/bucket.service';
import { PrivateChat, PrivateMessage } from 'src/chats/entities';
import { PaginationParams } from 'src/common/decorators';
import { MetaDto, ResponseFactory } from 'src/common/dto';
import { DataSource, QueryFailedError } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bucketService: BucketService,
  ) {}

  async findMatchingUser(
    usernameQuery: string | undefined,
    pagination: PaginationParams,
  ) {
    const userRepository = this.dataSource.getRepository(User);
    let queryBuilder = userRepository.createQueryBuilder('user');

    // Apply username filter
    if (usernameQuery) {
      queryBuilder = queryBuilder.where('user.username ILIKE :username', {
        username: `%${usernameQuery}%`,
      });
    }

    // Count total
    const totalData = await queryBuilder.getCount();
    const totalPage = Math.ceil(totalData / pagination.limit);
    queryBuilder = queryBuilder
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit);

    // Execute query
    const users = await queryBuilder.getMany();

    const meta: MetaDto = {
      page: pagination.page,
      limit: pagination.limit,
      totalData,
      totalPage,
    };

    return { users, meta };
  }

  async uploadProfilePicture(
    userId: string,
    data: UploadProfilePictureRequestDto,
  ) {
    // Upload
    const newAvatarURL = await this.bucketService.upload(data.avatarImage, {
      resource_type: 'image',
      folder: 'avatars',
      public_id: `user-${userId}`,
      overwrite: true,
    });

    return newAvatarURL;
  }

  async getProfileData(userId: string) {
    const userRepository = this.dataSource.getRepository(User);

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(
        ResponseFactory.createErrorResponse('User not found'),
      );
    }

    return { user };
  }

  async updateProfileData(userId: string, data: UpdateProfileDataRequestDto) {
    const userRepository = this.dataSource.getRepository(User);

    try {
      const updatedUser = await userRepository.save({
        id: userId,
        username: data.username,
        name: data.name,
        about: data.about,
        avatarUrl: data.avatarUrl,
      });

      return updatedUser;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === '23505'
      ) {
        // Username already exists
        throw new BadRequestException(
          ResponseFactory.createErrorResponse('Username already exists', [
            { field: 'username', message: 'Username already exists' },
          ]),
        );
      } else {
        // Unexpected error
        throw new InternalServerErrorException(
          ResponseFactory.createErrorResponse('Failed to update profile data'),
        );
      }
    }
  }

  async getExistingOrCreateNewChat(
    currentUserId: string,
    targetUserId: string,
  ) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        ResponseFactory.createErrorResponse('Cannot chat with yourself'),
      );
    }

    const userRepository = this.dataSource.getRepository(User);
    const privateChatRepository = this.dataSource.getRepository(PrivateChat);

    const user1Id =
      currentUserId <= targetUserId ? currentUserId : targetUserId;
    const user2Id =
      currentUserId <= targetUserId ? targetUserId : currentUserId;

    // Check if chat already exists
    try {
      const existingPrivateChat = await privateChatRepository.findOne({
        where: { user1: { id: user1Id }, user2: { id: user2Id } },
        relations: ['user1', 'user2'],
      });
      if (existingPrivateChat) {
        // Get messages (last 25)
        const privateMessages = await this.dataSource
          .getRepository(PrivateMessage)
          .find({
            where: { privateChat: { id: existingPrivateChat.id } },
            order: { createdAt: 'DESC' },
            take: 25,
          });

        existingPrivateChat.otherUser =
          existingPrivateChat.user1.id === currentUserId
            ? existingPrivateChat.user2
            : existingPrivateChat.user1;
        existingPrivateChat.messages = privateMessages;

        return { newChat: existingPrivateChat };
      }
    } catch (error) {
      // Other errors
      throw new InternalServerErrorException(
        ResponseFactory.createErrorResponse('Failed to get chat data'),
      );
    }

    const [user1, user2] = await Promise.all([
      userRepository.findOne({ where: { id: user1Id } }),
      userRepository.findOne({ where: { id: user2Id } }),
    ]);
    if (!user1 || !user2) {
      throw new BadRequestException(
        ResponseFactory.createErrorResponse('User not found'),
      );
    }

    try {
      // Create new chat
      const newPrivateChat = await privateChatRepository.save({
        user1: user1,
        user2: user2,
      });

      newPrivateChat.otherUser =
        newPrivateChat.user1.id === currentUserId
          ? newPrivateChat.user2
          : newPrivateChat.user1;
      newPrivateChat.messages = [];

      return { newChat: newPrivateChat };
    } catch (error) {
      // Other errors
      throw new InternalServerErrorException(
        ResponseFactory.createErrorResponse('Failed to create chat data'),
      );
    }
  }
}
