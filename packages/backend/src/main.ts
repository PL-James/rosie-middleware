import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('ROSIE Middleware API')
    .setDescription(
      'REST API for scanning, indexing, and accessing GxP artifacts from ROSIE-compliant repositories',
    )
    .setVersion('0.1.0')
    .addTag('repositories', 'Repository management')
    .addTag('scans', 'Repository scanning')
    .addTag('artifacts', 'GxP artifact access')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
  🚀 ROSIE Middleware API is running

  📍 Server:     http://localhost:${port}
  📚 API Docs:   http://localhost:${port}/api/docs
  🏥 Health:     http://localhost:${port}/api/v1/health

  `);
}

bootstrap();
