import { AuthModule } from './auth/auth.module';
import { BucketModule } from './bucket/bucket.module';
import { ChatsModule } from './chats/chats.module';
import { CommonModule } from './common';
import { HttpValidationPipe } from './common/pipes';
import { CustomConfigModule, CustomConfigService } from './config';
import { loggerConfig } from './config/logger';
import { UsersModule } from './users/users.module';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryStoredFile, NestjsFormDataModule } from 'nestjs-form-data';
import { LoggerErrorInterceptor, LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    // Global Nest ConfigModule Wrapper
    CustomConfigModule,
    // Global Common Module
    CommonModule,
    // Logger (nestjs-pino) Module
    LoggerModule.forRoot(loggerConfig),
    // TypeORM Config Module
    TypeOrmModule.forRootAsync({
      inject: [CustomConfigService],
      useFactory: async (configService: CustomConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        synchronize: false,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
      }),
    }),
    // Form data parser
    NestjsFormDataModule.config({
      isGlobal: true,
      storage: MemoryStoredFile,
    }),
    // Global Auth Module
    AuthModule,
    // Bucket module
    BucketModule,
    // Other (Non global) Modules
    UsersModule,
    ChatsModule,
  ],
  providers: [
    // Global validation pipe
    {
      provide: APP_PIPE,
      useClass: HttpValidationPipe,
    },
    // Global error logger with interceptor (nestjs-pino)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerErrorInterceptor,
    },
  ],
})
export class AppModule {}
