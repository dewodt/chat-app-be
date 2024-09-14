import { ChatsService } from './chats.service';
import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HttpJwtGuard } from 'src/auth/guards';
import { UserPayload } from 'src/auth/interfaces';
import { HttpReqUser, CursorPagination } from 'src/common/decorators';
import { CursorPaginationRequestQuery, ResponseFactory } from 'src/common/dto';

@Controller('chats')
@UseGuards(HttpJwtGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get('inbox')
  async getChatInbox(
    @HttpReqUser() reqUser: UserPayload,
    @Query('title') title: string | undefined,
    @CursorPagination({ defaultLimit: 15 })
    pagination: CursorPaginationRequestQuery,
  ) {
    // Private
    const { privateChatInboxesDto, metaDto } =
      await this.chatsService.getPrivateChatInboxes(
        reqUser.userId,
        title,
        pagination,
      );

    const response = ResponseFactory.createSuccessCursorPaginatedResponse(
      'Chat inboxes fetched successfully',
      privateChatInboxesDto,
      metaDto,
    );

    return response;
  }

  @Get(':id/messages')
  @HttpCode(200)
  async getChatMessages(
    @HttpReqUser() reqUser: UserPayload,
    @Param('id', ParseUUIDPipe) chatId: string,
    @CursorPagination({ defaultLimit: 25 })
    pagination: CursorPaginationRequestQuery,
  ) {
    // Get private chat messages
    const { messagesDto, metaDto } =
      await this.chatsService.getPrivateChatMessage(
        reqUser.userId,
        chatId,
        pagination,
      );

    // // Map to response
    const response = ResponseFactory.createSuccessCursorPaginatedResponse(
      'Chat messages fetched successfully',
      messagesDto,
      metaDto,
    );

    return response;
  }
}
