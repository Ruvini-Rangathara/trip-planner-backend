import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import cors from './cors.js';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule } from '@nestjs/swagger';

export const GLOBAL_PREFIX = '/ceylon-guide/api/';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  app.setGlobalPrefix(GLOBAL_PREFIX, {
    exclude: ['/', 'docs', '/health'],
  });
  app.enableCors(cors);
  app.useLogger(app.get(PinoLogger));

  const config = new DocumentBuilder()
    .setTitle('Ceylon Guide API')
    .setDescription('API documentation for the Ceylon Guide')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  const port = process.env.PORT ?? 9062;
  await app.listen(port).then(() => {
    const logger = new Logger('main');
    logger.debug(`Server running on port: ${port} 🚀`);
  });
}
void bootstrap();
