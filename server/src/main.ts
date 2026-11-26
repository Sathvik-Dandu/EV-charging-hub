import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

const REQUIRED_ENV = ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ACCESS_EXPIRES', 'JWT_REFRESH_EXPIRES'];

async function bootstrap() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    Logger.error(`Missing settings in server/.env: ${missing.join(', ')}. Copy them from server/.env.example.`, 'Bootstrap');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());

  const swagger = new DocumentBuilder()
    .setTitle('Green Mobility Charge Hub API')
    .setDescription('EV Charging Network & Slot Booking Management Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API ready on http://localhost:${port}/api  |  Docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
