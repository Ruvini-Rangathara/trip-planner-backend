import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import cors from './cors.js';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule } from '@nestjs/swagger';

export const GLOBAL_PREFIX = '/ceylon-guide';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  app.setGlobalPrefix(GLOBAL_PREFIX, {
    exclude: ['/', 'docs', '/health'],
  });
  app.enableCors(cors);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.useLogger(app.get(PinoLogger));

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  const config = new DocumentBuilder()
    .setTitle('CEYLON GUIDE BACKEND')
    .setDescription('API for Ceylon Guide Backend')
    .setVersion('1.0')
    .setExternalDoc('Postman Collection', '/docs-json')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(GLOBAL_PREFIX + '/docs', app, document);
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

  const port = process.env.PORT ?? 9062;
  await app.listen(port).then(() => {
    const logger = new Logger('main');
    logger.debug(`Server running on port: ${port} 🚀`);
  });
}
void bootstrap();
