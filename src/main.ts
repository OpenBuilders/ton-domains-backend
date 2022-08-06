import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getBotToken } from 'nestjs-telegraf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
  });

  const isDev = config.get('app.nodeEnv') === 'development';
  if (!isDev) {
    const bot = app.get(getBotToken());
    app.use(bot.webhookCallback(config.get('app.bot.path')));
  }

  const port = config.get('server.httpPort');
  const httpProtocol = config.get('server.httpProtocol');
  const environment = config.get('environment');
  await app.listen(port, () => {
    Logger.log(
      `Listening at ${httpProtocol}://localhost:${port} in ${environment} mode`,
    );
  });
}

bootstrap();
