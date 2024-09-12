import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Module } from '@nestjs/common';
import { BucketModule } from 'src/bucket/bucket.module';
import { ChatsModule } from 'src/chats/chats.module';
import { ChatsService } from 'src/chats/chats.service';

@Module({
  imports: [BucketModule, ChatsModule],
  controllers: [UsersController],
  providers: [UsersService, ChatsService],
})
export class UsersModule {}
