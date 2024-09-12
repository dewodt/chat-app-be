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
}
