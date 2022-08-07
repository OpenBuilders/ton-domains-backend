import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ApiService } from '../api/api.service';
import { BlockchainDomainEntity } from './blockchainDomain.entity';
import { UserFollowEntity } from '../user/user-follow.entity';

@Injectable()
export class DomainsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly apiService: ApiService,
  ) {}

  /* @cron here? */
  async syncProcessingDomains() {
    const userFollows = await this.prismaService.userFollow.findMany({
      where: {
        blockchainDomain: {
          OR: [
            {
              status: {
                in: ['booked', 'processing'],
              },
            },
            {
              status: null,
            },
          ],
        },
      },
      include: {
        blockchainDomain: true,
      },
      take: 100,
    });
    Logger.debug('Auction rows to sync', {
      length: userFollows.length,
    });
    userFollows.map((userFollow) => {
      if (!userFollow.blockchainDomain) return;
      this.syncOneDomain(
        new BlockchainDomainEntity(userFollow.blockchainDomain),
      ).catch((err) => {
        Logger.error("Can't sync one domain", {
          err: err,
          domain: {
            ...userFollow.blockchainDomain,
          },
        });
      });
    });
  }

  async syncOneDomain(domain: BlockchainDomainEntity, withUpdate = true) {
    const fullData = await this.apiService.getStateByDomain(domain.name);

    if (fullData.isActive) {
      domain.isValid = true;
      domain.isSynced = true;
      domain.ownerAddress = fullData.domainState?.ownerAddress;
      domain.auctionAddress = fullData.address;

      if (fullData.domainState?.auction) {
        domain.currentBid = fullData.domainState.auction.maxBidAmount;
        domain.currentAddress = fullData.domainState.auction?.maxBidAddress;

        const finishAtDate = new Date(
          Number(`${fullData.domainState.auction.auctionEndTime}000`),
        );
        domain.lastBidAt = new Date();
        domain.finishAt = finishAtDate;

        if (finishAtDate.getTime() > new Date().getTime()) {
          domain.status = 'auction';
        } else {
          domain.status = 'sold';
          const ownerId = domain?.UserFollow?.pop()?.userId;

          if (ownerId) {
            domain.userId = ownerId;
            // this.notifyService.sendMsg(telegramId, 'domainOwned', domain.name)
          }
        }
      } else {
        if (domain.status != 'auction') {
          domain.status = 'sync';
        }
      }
    } else {
      domain.isSynced = true;
      domain.auctionAddress = fullData.address;
    }

    if (!withUpdate) {
      return domain;
    }

    try {
      await this.prismaService.blockchainDomain.update({
        where: {
          id: domain.id,
        },
        data: {
          initiatorAddress: domain.initiatorAddress,
          ownerAddress: domain.ownerAddress,
          auctionAddress: domain.auctionAddress,
          transactionHash: domain.transactionHash,
          lt: domain.lt,
          isValid: domain.isValid,
          isSynced: domain.isSynced,
          status: domain.status,
          currentAddress: domain.currentAddress,
          currentBid: domain.currentBid,
          lastBidAt: domain.lastBidAt,
          finishAt: domain.finishAt,
        },
      });
    } catch (err) {
      Logger.error('Error on update domain data', err);
    }
  }

  async setLastTransactionTime(userFollow: UserFollowEntity) {
    return this.prismaService.userFollow
      .updateMany({
        where: {
          // userId: userFollow.userId,
          domainName: userFollow.domainName,
        },
        data: {
          lastTransactionTime: new Date(),
        },
      })
      .then(() =>
        Logger.log('Cooldown is updated', { userId: userFollow.userId }),
      )
      .catch((err) => {
        Logger.error('Error while try to update lastTransactionTime', {
          err,
          userId: userFollow.userId,
        });
      });
  }
}
