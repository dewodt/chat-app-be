import { SeederModule } from './database/seeder/seeder.module';
import { SeederService } from './database/seeder/seeder.service';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // Create nest app
  const app = await NestFactory.create<NestExpressApplication>(SeederModule, {
    bufferLogs: true,
  });

  const seederService = app.get(SeederService);

  try {
    seederService.seed();
  } catch (error) {
    console.error(error);
    return;
  }

  console.log('Seed success');
}

bootstrap();
