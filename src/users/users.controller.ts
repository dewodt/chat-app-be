import { UserResponseFactory } from './dto/user.dto';
import { UsersService } from './users.service';
import { Controller, Get, Query } from '@nestjs/common';
import { Pagination, PaginationParams } from 'src/common/decorators';
import { ResponseFactory } from 'src/common/dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('username') username: string | undefined,
    @Pagination({ defaultLimit: 15 }) pagination: PaginationParams,
  ) {
    // Find users
    const { users, meta } = await this.usersService.findMatchingUser(
      username,
      pagination,
    );

    // Map user to dto
    const usersDto = UserResponseFactory.createUserDtoList(users);

    // Return response
    return ResponseFactory.createSuccessPaginatedResponse(
      'Get users success',
      usersDto,
      meta,
    );
  }
}
