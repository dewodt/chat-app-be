import { ChatType, PrivateChat, PrivateMessage } from '../entities';

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

export interface Message {
  messageId: string;
  content: string;
  editedAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export class ChatResponseFactory {
  static createPrivateChatInbox(privateChat: PrivateChat) {
    return {
      chatId: privateChat.id,
      type: ChatType.PRIVATE,
      title: privateChat.otherUser.name,
      avatarUrl: privateChat.otherUser.avatarUrl,
      unreadCount: privateChat.unreadCount,
      lastMessage: {
        content: privateChat.latestMessage.content,
        createdAt: privateChat.latestMessage.createdAt,
        deletedAt: privateChat.latestMessage.deletedAt,
      },
    };
  }

  static createMessage(message: PrivateMessage): Message {
    return {
      messageId: message.id,
      content: message.content,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      readAt: message.readAt,
      deletedAt: message.deletedAt,
    };
  }

  static createPrivateChat(privateChat: PrivateChat) {
    return {
      chatId: privateChat.id,
      type: ChatType.PRIVATE,
      title: privateChat.otherUser.name,
      avatarUrl: privateChat.otherUser.avatarUrl,
      messages: privateChat.messages.map((message) =>
        ChatResponseFactory.createMessage(message),
      ),
    };
  }

  static createPrivateChatInboxes(privateChats: PrivateChat[]) {
    return privateChats.map((privateChat) =>
      ChatResponseFactory.createPrivateChatInbox(privateChat),
    );
  }

  static createMessages(messages: PrivateMessage[]) {
    return messages.map((message) =>
      ChatResponseFactory.createMessage(message),
    );
  }
}
