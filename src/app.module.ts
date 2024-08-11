import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { CommonModule, ExceptionsFilter } from './common';
import { ConfigModule, ConfigService, loggerOptions } from './config';
import { UsersModule } from './users/users.module';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerErrorInterceptor, LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    // Global Nest ConfigModule Wrapper
    ConfigModule,
    // Global Common Module
    CommonModule,
    // Logger (nestjs-pino) Module
    LoggerModule.forRoot(loggerOptions),
    // TypeORM Config Module
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        synchronize: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
      }),
    }),
    // Other (Non global) Modules
    AuthModule,
    UsersModule,
    ChatsModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: ExceptionsFilter,
    },
    // Global pipe
    {
      provide: APP_FILTER,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    },
    // Global error logger with interceptor (nestjs-pino)
    {
      provide: APP_INTERCEPTOR,
      useValue: new LoggerErrorInterceptor(),
    },
  ],
})
export class AppModule {}
