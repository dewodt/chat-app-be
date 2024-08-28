import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import {
  GroupChat,
  GroupChatParticipant,
  GroupMessage,
  GroupParticipantRole,
  PrivateChat,
  PrivateMessage,
} from 'src/chats/entities';
import { User } from 'src/users/entities';
import { DataSource } from 'typeorm';

@Injectable()
export class SeederService {
  constructor(private readonly dataSource: DataSource) {}

  async seed() {
    // Connect
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    const generatedUsers: User[] = [];
    const generatedPrivateChats: PrivateChat[] = [];
    const generatedPrivateMessages: PrivateMessage[] = [];
    const generatedGroupChatParticipants: GroupChatParticipant[] = [];
    const generatedGroupChats: GroupChat[] = [];
    const generatedGroupMessages: GroupMessage[] = [];

    // Generate 30 users
    const password = await hash('password', 10);
    for (let i = 0; i < 30; i++) {
      const user = queryRunner.manager.create(User, {
        id: faker.string.uuid(),
        username: faker.internet.userName(),
        name: faker.person.firstName(),
        password: password,
        about: faker.datatype.boolean() ? faker.lorem.sentence() : null,
        avatarUrl: faker.datatype.boolean() ? faker.image.avatar() : null,
      });

      generatedUsers.push(user);
    }
    // Custom user
    const customUser = queryRunner.manager.create(User, {
      id: faker.string.uuid(),
      username: 'user',
      name: 'User',
      password: password,
      about: 'Ini User',
      avatarUrl: faker.image.avatar(),
    });
    generatedUsers.push(customUser);

    // For each user, generate 10-20 private chats
    for (const user of generatedUsers) {
      const usersWithoutSelf = generatedUsers.filter((u) => u.id !== user.id);
      const randomPrivateChats = faker.number.int({ min: 10, max: 15 });
      const randomUsers = faker.helpers.arrayElements(
        usersWithoutSelf,
        randomPrivateChats,
      );

      for (const randomUser of randomUsers) {
        const { user1, user2 } = this.determineUser12(user, randomUser);
        const privateChat = queryRunner.manager.create(PrivateChat, {
          id: faker.string.uuid(),
          user1,
          user2,
        });

        generatedPrivateChats.push(privateChat);

        // For each private chat, generate 20-30 messages
        const randomMessages = faker.number.int({ min: 20, max: 30 });
        for (let i = 0; i < randomMessages; i++) {
          const privateMessage = queryRunner.manager.create(PrivateMessage, {
            id: faker.string.uuid(),
            privateChat,
            sender: faker.helpers.arrayElement([user, randomUser]),
            content: faker.lorem.sentence(),
            createdAt: faker.date.recent({ days: 30 }),
            deletedAt: faker.datatype.boolean({ probability: 0.1 })
              ? faker.date.recent({ days: 30 })
              : null,
          });

          generatedPrivateMessages.push(privateMessage);
        }
      }
    }

    // Generate 10 group chats
    for (let i = 0; i < 10; i++) {
      const groupChat = queryRunner.manager.create(GroupChat, {
        id: faker.string.uuid(),
        title: faker.lorem.words(2),
        avatarUrl: faker.datatype.boolean() ? faker.image.avatar() : null,
        about: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      });

      generatedGroupChats.push(groupChat);

      // For each of the group chat, assign 4-6 random users
      const randomUsers = faker.helpers.arrayElements(generatedUsers, 6);
      let i = 0;
      for (const randomUser of randomUsers) {
        const groupChatParticipant = queryRunner.manager.create(
          GroupChatParticipant,
          {
            id: faker.string.uuid(),
            groupChat,
            user: randomUser,
            role:
              i < 2 ? GroupParticipantRole.ADMIN : GroupParticipantRole.MEMBER,
          },
        );

        generatedGroupChatParticipants.push(groupChatParticipant);

        i++;
      }

      // Generate group messages. for each group chat, generate 20-30 messages
      const randomMessages = faker.number.int({ min: 20, max: 30 });
      for (let i = 0; i < randomMessages; i++) {
        const groupMessage = queryRunner.manager.create(GroupMessage, {
          id: faker.string.uuid(),
          groupChat,
          sender: faker.helpers.arrayElement(randomUsers),
          content: faker.lorem.sentence(),
          createdAt: faker.date.recent({ days: 30 }),
          deletedAt: faker.datatype.boolean({ probability: 0.1 })
            ? faker.date.recent({ days: 30 })
            : null,
        });

        generatedGroupMessages.push(groupMessage);
      }
    }

    // Reset db
    try {
      await queryRunner.startTransaction();

      await queryRunner.manager.delete(GroupMessage, {});
      await queryRunner.manager.delete(GroupChatParticipant, {});
      await queryRunner.manager.delete(GroupChat, {});
      await queryRunner.manager.delete(PrivateMessage, {});
      await queryRunner.manager.delete(PrivateChat, {});
      await queryRunner.manager.delete(User, {});

      await queryRunner.manager.save(User, generatedUsers);
      await queryRunner.manager.save(PrivateChat, generatedPrivateChats);
      await queryRunner.manager.save(PrivateMessage, generatedPrivateMessages);
      await queryRunner.manager.save(GroupChat, generatedGroupChats);
      await queryRunner.manager.save(
        GroupChatParticipant,
        generatedGroupChatParticipants,
      );
      await queryRunner.manager.save(GroupMessage, generatedGroupMessages);

      await queryRunner.commitTransaction();
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
    }

    await queryRunner.release();
  }

  async reset() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await queryRunner.manager.delete(GroupMessage, {});
      await queryRunner.manager.delete(GroupChatParticipant, {});
      await queryRunner.manager.delete(GroupChat, {});
      await queryRunner.manager.delete(PrivateMessage, {});
      await queryRunner.manager.delete(PrivateChat, {});
      await queryRunner.manager.delete(User, {});

      await queryRunner.commitTransaction();
    } catch (error) {
      console.error(error);
      await queryRunner.rollbackTransaction();
    }

    await queryRunner.release();
  }

  // userId1 < userId2
  determineUser12(randomUser1: User, randomUser2: User) {
    if (randomUser1.id < randomUser2.id) {
      return {
        user1: randomUser1,
        user2: randomUser2,
      };
    } else {
      return {
        user1: randomUser2,
        user2: randomUser1,
      };
    }
  }
}
