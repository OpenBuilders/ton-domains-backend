import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ApiService } from '../api/api.service';
import { NotifyService } from '../notify/notify.service';
import { BlockchainDomainEntity } from './blockchainDomain.entity';
import { ConfigService } from '@nestjs/config';
import { iTransaction } from '../api/highload-wallet.service';
import Big from 'big.js';
import { UserFollowEntity } from '../user/user-follow.entity';
import { UserFollow } from '@prisma/client';
import { DomainsService } from './domains.service';
import { SharedService } from '../shared/shared.service';

@Injectable()
export class AuctionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly apiService: ApiService,
    private readonly configService: ConfigService,
    private readonly notifyService: NotifyService,
    private readonly domainService: DomainsService,
  ) {
  }

  private static canPay(userFollow, nextBid) {
    const bidIsSame = new Big(nextBid ?? 0).eq(
      userFollow.blockchainDomain.currentBid ?? 0,
    );
    const userMaxBid = new Big(userFollow.maxBid ?? 0);
    const userMaxBidGTNextBid = userMaxBid.gte(nextBid);
    const userBalance = SharedService.getUserBalance(userFollow.user);
    const userBalanceIsEnough = userBalance.plus(userMaxBid).gte(nextBid);

    if (userMaxBidGTNextBid && userBalanceIsEnough && !bidIsSame) {
      Logger.debug('Domain can be renew', {
        userId: userFollow.userId,
        domainName: userFollow.domainName,
      });
      return true;
    } else {
      return false;
    }
  }

  async clearAuction() {
    const needToSync = await this.prismaService.blockchainDomain.findFirst({
      where: {
        status: {
          in: ['auction', 'sync'],
        },
        isSynced: false,
        NOT: [
          {
            userId: null,
          },
        ],
      },
      take: 1,
    });

    if (needToSync !== null) {
      return;
    }

    await this.prismaService.blockchainDomain.updateMany({
      where: {
        status: 'auction',
        NOT: [
          {
            userId: null,
          },
        ],
      },
      data: {
        isSynced: false,
      },
    });
  }

  /* @cron here? */
  async syncAuctionAddresses() {
    const userFollows = await this.prismaService.userFollow.findMany({
      where: {
        blockchainDomain: {
          status: {
            in: ['auction', 'sync'],
          },
          isSynced: false,
        },
      },
      include: {
        blockchainDomain: true,
      },
      take: 50,
    });

    userFollows.map((userFollow) => {
      if (!userFollow.blockchainDomain) return;
      this.domainService
        .syncOneDomain(new BlockchainDomainEntity(userFollow.blockchainDomain))
        .catch((err) => {
          Logger.error("Can't sync one domain", {
            err: err,
            domain: {
              ...userFollow,
            },
          });
        });
    });
  }

  isTimeForPay(userFollow: UserFollow) {
    const now = new Date();
    if (
      userFollow?.outbidDatetime &&
      now.getTime() > userFollow.outbidDatetime.getTime()
    ) {
      Logger.debug('Skip before outbidDatetime');
      return false;
    } else {
      return true;
    }
  }

  async renewAuction() {
    const userFollows = await this.prismaService.userFollow.findMany({
      where: {
        onPause: false,
        blockchainDomain: {
          status: 'auction',
        },
      },
      include: {
        blockchainDomain: true,
        user: true,
      }, // TODO: Should add limit, because it's can be a lot in one time for sync
    });

    Logger.debug('Auction rows to sync for renew', {
      length: userFollows.length,
    });

    const transactions: iTransaction[] = this.prepareTransactions(userFollows);

    Logger.log('Transaction in RENEW auction', {
      transactions,
    });

    await this.apiService.highloadTransfer(transactions).catch((err) => {
      Logger.error('Renew Auction failed', {
        err: err,
      });
    });
  }

  private prepareTransactions(userFollows): iTransaction[] {
    const preparedTransactions: iTransaction[] = [];
    const highloadWalletAddress = this.configService.get(
      'app.blockchain.walletHighload',
    );

    const handledNames = [];
    for (const userFollow of userFollows) {
      if (!this.isTimeForPay(userFollow)) {
        continue;
      }

      if (handledNames.includes(userFollow.name)) {
        continue;
      }

      const transaction = this.handleSingleFollow(
        userFollow,
        highloadWalletAddress,
      );

      if (transaction) {
        Logger.log('transaction in array', {
          transaction,
        });
        handledNames.push(userFollow.name);
        preparedTransactions.push(transaction);
      }
    }

    Logger.log('preparedTransactions', {
      preparedTransactions,
    });
    return preparedTransactions;
  }

  private handleSingleFollow(userFollow, highloadWalletAddress): iTransaction {
    let transaction: iTransaction;
    const nextBid = SharedService.getNextBid(
      userFollow.blockchainDomain.currentBid ?? 0,
    );

    const isUserAddressOwner =
      userFollow.user.walletAddress ===
      userFollow.blockchainDomain.ownerAddress;
    const isUserOwner =
      userFollow.blockchainDomain.userId == userFollow.userId &&
      userFollow.blockchainDomain.currentAddress == highloadWalletAddress;

    if (isUserAddressOwner || isUserOwner) {
      Logger.log('Skip renew auction because it is owner of domain', {
        userId: userFollow.userId,
        domainName: userFollow.domainName,
      });
      return;
    }

    if (AuctionService.canPay(userFollow, nextBid)) {
      /* if (await this.isCoolDown(userFollow)) {
        return null;
      }*/

      transaction = {
        destination: userFollow.blockchainDomain.auctionAddress,
        amount: nextBid.toFixed(0),
        isNano: true,
        message: null,
      };

      this.updateDomainEntity(userFollow, nextBid.toFixed(0));
      this.runSyncAfterAction(userFollow);
      Logger.log('Transaction before send', {
        transaction,
        userId: userFollow.userId,
        name: userFollow.domainName,
        nextBid: nextBid.toFixed(0),
      });
    } else {
      this.checkNotification(userFollow, highloadWalletAddress);
      this.updateNextUserBid(userFollow, nextBid.toFixed(0));

      return null;
    }

    return transaction;
  }

  private checkNotification(userFollow, addressWallet) {
    const userAddressIsOwner =
      userFollow.user.walletAddress ===
      userFollow.blockchainDomain.currentAddress;
    const isCurrentFollower =
      userFollow.blockchainDomain.userId == userFollow.userId;
    const isBotOwner =
      userFollow.blockchainDomain.currentAddress == addressWallet;

    if (
      !userAddressIsOwner &&
      (!isBotOwner || (isBotOwner && !isCurrentFollower))
    ) {
      this.notifyService.sendMsg(
        userFollow.user.telegramId,
        'maxBidLimit',
        new BlockchainDomainEntity(userFollow.blockchainDomain),
        new UserFollowEntity(userFollow),
      );
      Logger.log("Domain CAN'T be renew notification is send", {
        userId: userFollow.userId,
        domainName: userFollow.domainName,
      });
    }
  }

  private runSyncAfterAction(userFollow) {
    this.domainService
      .syncOneDomain(new BlockchainDomainEntity(userFollow.blockchainDomain))
      .then(() => Logger.log('Sync one domain after renew auction'))
      .catch(() => Logger.error("Can't sync domain after renew auction"));
  }

  private updateDomainEntity(userFollow, newBid) {
    this.prismaService.blockchainDomain
      .update({
        where: {
          name: userFollow.blockchainDomain.name,
        },
        data: {
          userId: userFollow.userId,
        },
      })
      .then(() => {
        Logger.log('Updated user owner of domain', {
          userId: userFollow.userId,
          domainName: userFollow.domainName,
          nextBid: newBid,
        });
      })
      .catch((err) => {
        Logger.error("Can't update owner of domain", {
          err,
          userId: userFollow.userId,
        });
      });
  }

  private updateNextUserBid(userFollow, newBid) {
    this.prismaService.userFollow
      .updateMany({
        where: {
          domainName: userFollow.domainName,
        },
        data: {
          nextBid: newBid,
        },
      })
      .then(() => {
        Logger.log('Next bid for renew auction of User updated', {
          userId: userFollow.userId,
        });
      })
      .catch((err) => {
        Logger.error("Can't updated nextBid for userFollow project", {
          userId: userFollow.userId,
          name: userFollow.domainName,
          err: err,
        });
      });
  }

  private async isCoolDown(userFollow) {
    if (userFollow.lastTransactionTime) {
      const lastTime = userFollow.lastTransactionTime.getTime();
      const now = new Date().getTime();
      const cooldown = 1000 * 60 * 1.5; // 1.5 minutes

      if (now - lastTime < cooldown) {
        Logger.log('Cooldown for user', {
          userId: userFollow.userId,
        });
        return true;
      }
    }

    await this.domainService.setLastTransactionTime(
      new UserFollowEntity(userFollow),
    );

    return false;
  }
}
