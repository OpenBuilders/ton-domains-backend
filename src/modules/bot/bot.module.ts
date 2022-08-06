import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { BotAction } from './bot.action';
import { BotService } from './bot.service';
import { PrismaModule } from '../../modules/prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        if (configService.get('app.nodeEnv') === 'development') {
          return {
            token: configService.get('app.bot.token'),
          };
        } else {
          return {
            token: configService.get('app.bot.token'),
            launchOptions: {
              webhook: {
                domain: configService.get('app.bot.domain'),
                hookPath: configService.get('app.bot.path'),
              },
            },
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [BotUpdate, BotAction, BotService],
  exports: [BotService],
})
export class BotModule {}
