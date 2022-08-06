import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookService } from './book.service';
import { AuctionService } from './auction.service';
import { DomainsService } from './domains.service';
import { BalanceService } from '../balance/balance.service';
import { TransferService } from './transfer.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly bookService: BookService,
    private readonly auctionService: AuctionService,
    private readonly domainService: DomainsService,
    private readonly balanceService: BalanceService,
    private readonly transferService: TransferService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS) // TODO: Change for every 15 minutes
  automateSyncAuction() {
    this.auctionService
      .syncAuctionAddresses()
      .then(() => {
        Logger.log('Auction domains is synced');
      })
      .catch((err) => {
        Logger.error("Can't make automation sync", err);
      });
  }

  @Cron(CronExpression.EVERY_30_SECONDS) // TODO: Change for every 15 minutes
  automateRenewAuction() {
    this.auctionService
      .renewAuction()
      .then(() => {
        Logger.log('Renew auction domains is over');
      })
      .catch((err) => {
        Logger.error("Can't make automation sync", err);
      });
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  automateSyncBefore() {
    this.domainService
      .syncProcessingDomains()
      .then(() => {
        Logger.log('Auction sync before domains is synced');
      })
      .catch((err) => {
        Logger.error("Can't make automation sync", err);
      });
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  automateClearAuction() {
    this.auctionService
      .clearAuction()
      .then(() => {
        Logger.log('Auction synced status is clear');
      })
      .catch((err) => {
        Logger.error("Can't make automation sync", err);
      });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  automateBuyBooked() {
    this.bookService
      .buyBooked()
      .then(() => {
        Logger.log('Buying booked domains is over');
      })
      .catch((err) => {
        Logger.error("Can't make automation sync", err);
      });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  automateTransferDomains() {
    this.transferService
      .transferDomainsToOwners()
      .then(() => {
        Logger.log('Transferring domains is over');
      })
      .catch((err) => {
        Logger.error("Can't transfer domains to owners", err);
      });
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  automateSyncBalance() {
    this.balanceService
      .syncTopups()
      .then(() => {
        Logger.log('Balances is up to date');
      })
      .catch((err) => {
        Logger.error("Can't sync balances", err);
      });
  }
}
