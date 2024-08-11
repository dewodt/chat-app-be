import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { ConfigModule, ConfigService } from './config';
import { UsersModule } from './users/users.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    // Custom Config Wrapper
    ConfigModule,

    // TypeORM Config
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

    // Other Modules
    AuthModule,
    UsersModule,
    ChatsModule,
  ],
})
export class AppModule {}
