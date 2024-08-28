import { SeederService } from './seeder.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomConfigModule, CustomConfigService } from 'src/config';

@Module({
  imports: [
    // Global NestJS ConfigModule Wrapper,
    CustomConfigModule,
    // TypeORM
    TypeOrmModule.forRootAsync({
      inject: [CustomConfigService],
      useFactory: async (configService: CustomConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        synchronize: true,
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      }),
    }),
  ],
  providers: [
    // Seeder service
    SeederService,
  ],
  exports: [
    // Seeder service
    SeederService,
  ],
})
export class SeederModule {}
