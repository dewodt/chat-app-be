import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  // Create nest app
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Logger using nestjs-pino
  app.useLogger(app.get(Logger));

  // Enable CORS
  app.enableCors({
    origin: process.env.CLIENT_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Origin, Content-Type, Authorization',
    exposedHeaders: 'Content-Length',
    credentials: true,
    maxAge: 24 * 60 * 60,
  });

  // Cookie parser
  app.use(cookieParser());

  // Start listening on port 3000
  await app.listen(process.env.SERVER_PORT || 3000);
}

bootstrap();
