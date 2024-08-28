import { User } from './entities';
import { Injectable } from '@nestjs/common';
import { PaginationParams } from 'src/common/decorators';
import { MetaDto } from 'src/common/dto';
import { DataSource } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(private readonly dataSource: DataSource) {}

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
    if (pagination.page > totalPage) {
      pagination.page = totalPage;
    }
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
}
