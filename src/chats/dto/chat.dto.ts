import { ChatType, PrivateChat, PrivateMessage } from '../entities';

export interface ChatInboxDto {
  chatId: string;
  type: ChatType;
  title: string;
  avatarUrl: string | null;
  unreadCount: number;
  lastMessage: {
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
  static createPrivateChatInbox(
    privateChat: PrivateChat,
    currentUserId: string,
  ): ChatInboxDto {
    const otherUser =
      privateChat.user1.id === currentUserId
        ? privateChat.user2
        : privateChat.user1;

    return {
      chatId: privateChat.id,
      type: ChatType.PRIVATE,
      title: otherUser.username,
      avatarUrl: otherUser.avatarUrl,
      unreadCount: privateChat.unreadCount,
      lastMessage: privateChat.latestMessage && {
        messageId: privateChat.latestMessage.id,
        content: privateChat.latestMessage.deletedAt
          ? null
          : privateChat.latestMessage.content,
        createdAt: privateChat.latestMessage.createdAt,
        deletedAt: privateChat.latestMessage.deletedAt,
      },
    };
  }

  static createMessage(message: PrivateMessage): MessageDto {
    return {
      messageId: message.id,
      chatId: message.privateChat.id,
      content: message.deletedAt ? null : message.content,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      readAt: message.readAt,
      deletedAt: message.deletedAt,
      senderId: message.sender.id,
    };
  }

  static createPrivateChatInboxes(
    privateChats: PrivateChat[],
    currentUserId: string,
  ) {
    return privateChats.map((privateChat) =>
      ChatResponseFactory.createPrivateChatInbox(privateChat, currentUserId),
    );
  }

  static createMessages(messages: PrivateMessage[]) {
    return messages.map((message) =>
      ChatResponseFactory.createMessage(message),
    );
  }
}
