import { BucketService } from './bucket.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [BucketService],
  exports: [BucketService],
})
export class BucketModule {}
