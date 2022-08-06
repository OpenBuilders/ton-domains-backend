import { Module } from '@nestjs/common';

import { ScheduleModule } from '@nestjs/schedule';
import { ApiModule } from '../api/api.module';
import { BalanceService } from './balance.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule, ApiModule, ConfigModule, PrismaModule],
  controllers: [],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {
}
