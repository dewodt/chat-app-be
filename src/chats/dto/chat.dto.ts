import { ChatType, PrivateChat, PrivateMessage } from '../entities';

export interface ChatInbox {
  chatId: string;
  type: ChatType;
  title: string;
  avatarUrl: string | null;
  unreadCount: number;
  lastMessage: {
    content: string | null;
    createdAt: Date;
    deletedAt: Date | null;
  };
}

export interface Message {
  messageId: string;
  content: string | null;
  editedAt: Date | null;
  isCurrentUserSender: boolean;
  readAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export class ChatResponseFactory {
  static createPrivateChatInbox(
    privateChat: PrivateChat,
    currentUserId: string,
  ) {
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
      lastMessage: {
        content: privateChat.latestMessage.deletedAt
          ? null
          : privateChat.latestMessage.content,
        createdAt: privateChat.latestMessage.createdAt,
        deletedAt: privateChat.latestMessage.deletedAt,
      },
    };
  }

  static createMessage(
    message: PrivateMessage,
    currentUserId: string,
  ): Message {
    return {
      messageId: message.id,
      content: message.deletedAt ? null : message.content,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      readAt: message.readAt,
      deletedAt: message.deletedAt,
      isCurrentUserSender: message.sender.id === currentUserId,
    };
  }

  static createPrivateChat(privateChat: PrivateChat, currentUserId: string) {
    const otherUser =
      privateChat.user1.id === currentUserId
        ? privateChat.user2
        : privateChat.user1;

    return {
      chatId: privateChat.id,
      type: ChatType.PRIVATE,
      title: otherUser.username,
      avatarUrl: otherUser.avatarUrl,
      messages: (privateChat.messages || []).map((message) =>
        ChatResponseFactory.createMessage(message, currentUserId),
      ),
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

  static createMessages(messages: PrivateMessage[], currentUserId: string) {
    return messages.map((message) =>
      ChatResponseFactory.createMessage(message, currentUserId),
    );
  }
}
