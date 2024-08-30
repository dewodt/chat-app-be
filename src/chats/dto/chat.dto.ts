import { ChatType, PrivateChat } from '../entities';

export interface ChatInbox {
  chatId: string;
  type: ChatType;
  title: string;
  avatarUrl: string | null;
  unreadCount: number;
  lastMessage: {
    content: string;
    createdAt: Date;
    deletedAt: Date | null;
  };
}

export class ChatResponseFactory {
  static createPrivateChatInbox(privateChat: PrivateChat) {
    return {
      chatId: privateChat.id,
      type: ChatType.PRIVATE,
      title: privateChat.toUser.name,
      avatarUrl: privateChat.toUser.avatarUrl,
      unreadCount: privateChat.unreadCount,
      lastMessage: {
        content: privateChat.latestMessage.content,
        createdAt: privateChat.latestMessage.createdAt,
        deletedAt: privateChat.latestMessage.deletedAt,
      },
    };
  }

  static createPrivateChatInboxes(privateChats: PrivateChat[]) {
    return privateChats.map((privateChat) =>
      ChatResponseFactory.createPrivateChatInbox(privateChat),
    );
  }
}
