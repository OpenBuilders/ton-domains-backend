import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DomainsModule } from './modules/domains/domains.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { BotModule } from './modules/bot/bot.module';
import { HttpModule } from '@nestjs/axios';
import { ApiModule } from './modules/api/api.module';
import { AuthModule } from './modules/auth/auth.module';
import { BalanceModule } from './modules/balance/balance.module';
import { UserModule } from './modules/user/user.module';
import { SharedModule } from './modules/shared/shared.module';
import { NotifyModule } from './modules/notify/notify.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    DomainsModule,
    PrismaModule,
    ConfigModule,
    BotModule,
    ApiModule,
    HttpModule,
    AuthModule,
    BalanceModule,
    UserModule,
    SharedModule,
    NotifyModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
