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
import { ChatsService } from 'src/chats/chats.service';
import { ChatResponseFactory } from 'src/chats/dto';
import {
  HttpReqUser,
  Pagination,
  PaginationParams,
} from 'src/common/decorators';
import { ResponseFactory } from 'src/common/dto';

@Controller('users')
@UseGuards(HttpJwtGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatService: ChatsService,
  ) {}

  @Get()
  @HttpCode(200)
  async findAll(
    @Query('username') username: string | undefined,
    @HttpReqUser() reqUser: UserPayload,
    @Pagination({ defaultLimit: 15 }) pagination: PaginationParams,
  ) {
    // Find users
    const { users, meta } =
      await this.usersService.findMatchingUserWithoutCurrentUser(
        username,
        reqUser.userId,
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

  @Post('profile-picture')
  @FormDataRequest()
  @HttpCode(200)
  async uploadProfilePicture(
    @Body() body: UploadProfilePictureRequestDto,
    @HttpReqUser() reqUser: UserPayload,
  ) {
    // Upload profile picture
    const newAvatarURL = await this.usersService.uploadProfilePicture(
      reqUser.userId,
      body,
    );

    // Map response
    const responseData: UploadProfilePictureResponseDto = {
      newAvatarUrl: newAvatarURL,
    };

    // Return response
    return ResponseFactory.createSuccessResponse(
      'Upload profile picture success',
      responseData,
    );
  }

  @Put('profile-data')
  @HttpCode(200)
  async updateProfileData(
    @Body() body: UpdateProfileDataRequestDto,
    @HttpReqUser() reqUser: UserPayload,
  ) {
    // Update profile data
    const updatedUser = await this.usersService.updateProfileData(
      reqUser.userId,
      body,
    );

    // Map user to dto
    const userDto = UserResponseFactory.createUserDto(updatedUser);

    // Return response
    return ResponseFactory.createSuccessResponse(
      'Update profile data success',
      userDto,
    );
  }

  @Get('profile-data')
  @HttpCode(200)
  async getProfileData(@HttpReqUser() reqUser: UserPayload) {
    // Get profile data
    const { user } = await this.usersService.getProfileData(reqUser.userId);

    // Map user to dto
    const userDto = UserResponseFactory.createUserDto(user);

    // Return response
    return ResponseFactory.createSuccessResponse(
      'Get profile data success',
      userDto,
    );
  }

  // Get existing chat (if any) or create new chat
  @Put(':id/chats')
  @HttpCode(200)
  async newChat(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @HttpReqUser() reqUser: UserPayload,
  ) {
    const { newOrExistingChat } =
      await this.chatService.getExistingOrCreateNewChat(
        reqUser.userId,
        targetUserId,
      );

    const chatInboxResponse = ChatResponseFactory.createPrivateChatInbox(
      newOrExistingChat,
      reqUser.userId,
    );

    // Map response
    const responseData = ResponseFactory.createSuccessResponse(
      'Get existing or created new chat successfully',
      chatInboxResponse,
    );

    // Return response
    return responseData;
  }
}
