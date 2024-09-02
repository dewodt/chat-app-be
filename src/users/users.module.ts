import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Module } from '@nestjs/common';
import { BucketModule } from 'src/bucket/bucket.module';

@Module({
  imports: [BucketModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
