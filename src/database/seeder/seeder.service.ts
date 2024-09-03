import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { addHours } from 'date-fns';
import { PrivateChat, PrivateMessage } from 'src/chats/entities';
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

    // For each user, generate 10-15 private chats
    for (const user of generatedUsers) {
      const usersWithoutSelf = generatedUsers.filter((u) => u.id !== user.id);
      generatedPrivateChats.forEach((pc) => {
        if (pc.user1.id === user.id || pc.user2.id === user.id) {
          const idx = usersWithoutSelf.findIndex(
            (val) => val.id === pc.user1.id || val.id === pc.user2.id,
          );
          usersWithoutSelf.splice(idx, 1);
        }
      });
      const randomPrivateChats = faker.number.int({
        min: 0,
        max: usersWithoutSelf.length - 1,
      });
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
        const isAllRead = faker.datatype.boolean();
        const determinedMessageStatusCount = 5;
        const lastMassgeSender = faker.helpers.arrayElement([user, randomUser]);

        for (let i = 0; i < randomMessages; i++) {
          const createdAt = addHours(new Date(), i * -6);

          const privateMessage = queryRunner.manager.create(PrivateMessage, {
            id: faker.string.uuid(),
            privateChat,
            content: faker.lorem.sentence(),
            createdAt: createdAt,
            deletedAt: faker.datatype.boolean({ probability: 0.1 })
              ? addHours(createdAt, 1)
              : null,
          });

          if (i >= determinedMessageStatusCount || isAllRead) {
            privateMessage.readAt = createdAt;
            privateMessage.sender = faker.helpers.arrayElement([
              user,
              randomUser,
            ]);
          } else {
            privateMessage.readAt = null;
            privateMessage.sender = lastMassgeSender;
          }

          generatedPrivateMessages.unshift(privateMessage);
        }
      }
    }

    // Reset db
    try {
      await queryRunner.startTransaction();

      await queryRunner.manager.delete(PrivateMessage, {});
      await queryRunner.manager.delete(PrivateChat, {});
      await queryRunner.manager.delete(User, {});

      await queryRunner.manager.save(User, generatedUsers, { chunk: 100 });
      await queryRunner.manager.save(PrivateChat, generatedPrivateChats, {
        chunk: 100,
      });
      await queryRunner.manager.save(PrivateMessage, generatedPrivateMessages, {
        chunk: 100,
      });

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
