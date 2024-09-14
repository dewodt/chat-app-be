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
import { CursorPagination, HttpReqUser } from 'src/common/decorators';
import { CursorPaginationRequestQuery, ResponseFactory } from 'src/common/dto';

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
    @CursorPagination({ defaultLimit: 15 })
    pagination: CursorPaginationRequestQuery,
  ) {
    // Find users
    const { users, metaDto } =
      await this.usersService.findMatchingUserWithoutCurrentUser(
        username,
        reqUser.userId,
        pagination,
      );

    // Map user to dto
    const usersDto = UserResponseFactory.createUserDtoList(users);

    // Return response
    return ResponseFactory.createSuccessCursorPaginatedResponse(
      'Get users success',
      usersDto,
      metaDto,
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
    return ResponseFactory.createSuccessResponseWithData(
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
    return ResponseFactory.createSuccessResponseWithData(
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
    return ResponseFactory.createSuccessResponseWithData(
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
    // Find existing chat
    const chatInboxDto = await this.chatService.getPrivateChatInbox(
      reqUser.userId,
      targetUserId,
    );

    if (chatInboxDto) {
      const response = ResponseFactory.createSuccessResponseWithData(
        'Get existing chat successfully',
        chatInboxDto,
      );

      return response;
    }

    // Create new chat if not found
    const newChatInbox = await this.chatService.createNewPrivateChat(
      reqUser.userId,
      targetUserId,
    );

    // Map response
    const response = ResponseFactory.createSuccessResponseWithData(
      'Created new chat successfully',
      newChatInbox,
    );

    // Return response
    return response;
  }
}
