import { PrivateMessage } from '../entities';

export interface ChatInboxDto {
  chatId: string;
  title: string;
  avatarUrl: string | null;
  unreadCount: number;
  latestMessage: {
    messageId: string;
    content: string | null;
    createdAt: Date;
    deletedAt: Date | null;
  } | null;
}

export interface MessageDto {
  messageId: string;
  chatId: string;
  content: string | null;
  editedAt: Date | null;
  senderId: string;
  readAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export class ChatResponseFactory {
  static createMessage(message: PrivateMessage): MessageDto {
    return {
      messageId: message.id,
      chatId: message.privateChatId,
      content: message.deletedAt ? null : message.content,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      readAt: message.readAt,
      deletedAt: message.deletedAt,
      senderId: message.senderId,
    };
  }

  static createMessages(messages: PrivateMessage[]) {
    return messages.map((message) =>
      ChatResponseFactory.createMessage(message),
    );
  }
}
