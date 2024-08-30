import { ChatsService } from './chats.service';
import { ChatResponseFactory } from './dto/chat.dto';
import { Controller, Get, Query } from '@nestjs/common';
import { UserPayload } from 'src/auth/interfaces';
import { Pagination, PaginationParams, ReqUser } from 'src/common/decorators';
import { ResponseFactory } from 'src/common/dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get('inbox')
  async getChatInbox(
    @ReqUser() user: UserPayload,
    @Query('title') title: string | undefined,
    @Pagination({ defaultLimit: 15 }) pagination: PaginationParams,
  ) {
    // Private
    const { privateChats, metaDto } =
      await this.chatsService.getPrivateChatInbox(
        user.userId,
        title,
        pagination,
      );

    // Map to response
    const chatInboxes =
      ChatResponseFactory.createPrivateChatInboxes(privateChats);

    const responseData = ResponseFactory.createSuccessPaginatedResponse(
      'Chat inboxes fetched successfully',
      chatInboxes,
      metaDto,
    );

    return responseData;
  }
}
