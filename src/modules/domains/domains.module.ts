import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { ApiModule } from '../api/api.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { SharedModule } from '../shared/shared.module';
import { NotifyModule } from '../notify/notify.module';
import { BookService } from './book.service';
import { AutomationService } from './automation.service';
import { AuctionService } from './auction.service';
import { TransferService } from './transfer.service';
import { BalanceModule } from '../balance/balance.module';

@Module({
  imports: [
    PrismaModule,
    ApiModule,
    ConfigModule,
    UserModule,
    SharedModule,
    NotifyModule,
    BalanceModule,
  ],
  controllers: [DomainsController],
  providers: [
    DomainsService,
    BookService,
    AutomationService,
    AuctionService,
    TransferService,
  ],
  exports: [
    DomainsService,
    BookService,
    AutomationService,
    AuctionService,
    TransferService,
  ],
})
export class DomainsModule {}
