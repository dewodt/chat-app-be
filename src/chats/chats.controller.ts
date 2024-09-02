import { ChatsService } from './chats.service';
import { ChatResponseFactory } from './dto/chat.dto';
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
import {
  Pagination,
  PaginationParams,
  HttpReqUser,
} from 'src/common/decorators';
import { ResponseFactory } from 'src/common/dto';

@Controller('chats')
@UseGuards(HttpJwtGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get('inbox')
  async getChatInbox(
    @HttpReqUser() user: UserPayload,
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

  @Get(':id/messages')
  @HttpCode(200)
  async getChatMessages(
    @HttpReqUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) chatId: string,
    @Pagination({ defaultLimit: 25 }) pagination: PaginationParams,
  ) {
    // Get private chat messages
    const { privateMessages, metaDto } =
      await this.chatsService.getPrivateChatMessage(
        user.userId,
        chatId,
        pagination,
      );

    // Map to response
    const messages = ChatResponseFactory.createMessages(privateMessages);
    const responseData = ResponseFactory.createSuccessPaginatedResponse(
      'Chat messages fetched successfully',
      messages,
      metaDto,
    );

    return responseData;
  }
}
