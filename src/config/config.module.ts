import { loadConfig } from './config.load';
import { ConfigService } from './config.service';
import { validateConfig } from './config.validation';
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: '.env',
      expandVariables: true,
      isGlobal: true,
      cache: true,
      load: [loadConfig],
      validate: validateConfig,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
