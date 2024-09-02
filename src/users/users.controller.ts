import {
  UpdateProfileDataRequestDto,
  UploadProfilePictureRequestDto,
  UploadProfilePictureResponseDto,
} from './dto';
import { UserResponseFactory } from './dto/user.dto';
import { UsersService } from './users.service';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FormDataRequest } from 'nestjs-form-data';
import { HttpJwtGuard } from 'src/auth/guards';
import { UserPayload } from 'src/auth/interfaces';
import {
  HttpReqUser,
  Pagination,
  PaginationParams,
} from 'src/common/decorators';
import { ResponseFactory } from 'src/common/dto';

@Controller('users')
@UseGuards(HttpJwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(200)
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

  @Post(':id/profile-picture')
  @FormDataRequest()
  @HttpCode(200)
  async uploadProfilePicture(
    @Body() body: UploadProfilePictureRequestDto,
    @Param('id', ParseUUIDPipe) id: string,
    @HttpReqUser() user: UserPayload,
  ) {
    // Check if user is updating their own profile picture
    if (user.userId !== id) {
      throw new ForbiddenException(
        ResponseFactory.createErrorResponse(
          'You are not allowed to update other user profile picture.',
        ),
      );
    }

    // Upload profile picture
    const newAvatarURL = await this.usersService.uploadProfilePicture(id, body);

    // Map response
    const responseData: UploadProfilePictureResponseDto = {
      avatarUrl: newAvatarURL,
    };

    // Return response
    return ResponseFactory.createSuccessResponse(
      'Upload profile picture success',
      responseData,
    );
  }

  @Put(':id/profile-data')
  @HttpCode(200)
  async updateProfileData(
    @Body() body: UpdateProfileDataRequestDto,
    @Param('id', ParseUUIDPipe) id: string,
    @HttpReqUser() user: UserPayload,
  ) {
    // Check if user is updating their own profile data
    if (user.userId !== id) {
      throw new ForbiddenException(
        ResponseFactory.createErrorResponse(
          'You are not allowed to update other user profile data.',
        ),
      );
    }

    // Update profile data
    const updatedUser = await this.usersService.updateProfileData(id, body);

    // Map user to dto
    const userDto = UserResponseFactory.createUserDto(updatedUser);

    // Return response
    return ResponseFactory.createSuccessResponse(
      'Update profile data success',
      userDto,
    );
  }
}
