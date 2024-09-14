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
import {
  CursorPaginationRequestQuery,
  CursorPaginationResponseMetaDto,
  ResponseFactory,
} from 'src/common/dto';
import { DataSource, QueryFailedError } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bucketService: BucketService,
  ) {}

  async findMatchingUserWithoutCurrentUser(
    usernameQuery: string | undefined,
    currentUserId: string,
    pagination: CursorPaginationRequestQuery,
  ) {
    const entityManager = this.dataSource.manager;

    const result = await entityManager.query<any[]>(
      `
        WITH users_sorted AS (
          SELECT
            u.id as "id",
            u.username as "username",
            u.name as "name",
            u.avatar_url as "avatarUrl",
            u.about as "about",
            ROW_NUMBER() OVER (ORDER BY u.username ASC) as "rn"
          FROM users u
          WHERE 
            (u.id <> $1::uuid) AND
            ($2::varchar IS NULL OR u.username ILIKE '%' || $2::varchar || '%') 
        ),
        current_cursor AS (
          SELECT
            CASE WHEN $3::uuid IS NULL THEN
              1
            ELSE
              COALESCE(
                (SELECT users_sorted.rn FROM users_sorted WHERE users_sorted.id = $3::uuid),
                1
              )
            END as rn
        )
        SELECT
          users_sorted."id",
          users_sorted."username",
          users_sorted."name",
          users_sorted."avatarUrl",
          users_sorted."about"
        FROM
          users_sorted
          LEFT JOIN current_cursor ON true
        WHERE
          users_sorted.rn >= current_cursor.rn
        ORDER BY
          users_sorted.rn ASC
        LIMIT
          $4::int + 1
      `,
      [currentUserId, usernameQuery, pagination.cursor, pagination.limit],
    );

    // Map to user entity
    const userRepository = this.dataSource.getRepository(User);
    const users = result.map((row) =>
      userRepository.create({
        id: row.id,
        username: row.username,
        name: row.name,
        avatarUrl: row.avatarUrl,
        about: row.about,
      }),
    );

    const metaDto: CursorPaginationResponseMetaDto = {
      cursor: pagination.cursor,
      limit: pagination.limit,
      nextCursor: null,
    };

    if (users.length > pagination.limit) {
      const nextUser = users.pop();
      if (nextUser) {
        metaDto.nextCursor = nextUser.id;
      }
    }

    return {
      users,
      metaDto,
    };
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
