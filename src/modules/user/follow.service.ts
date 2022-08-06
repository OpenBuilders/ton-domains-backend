import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from './user.entity';
import { UserFollowEntity } from './user-follow.entity';
import Big from 'big.js';
import { SharedService } from '../shared/shared.service';
import { ConfigService } from '@nestjs/config';

export interface iFollowProject {
  maxBid: string;
  name: string;
  onPause: boolean;
  isPin: boolean;
}

@Injectable()
export class FollowService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  public async getFollows(user: UserEntity) {
    const follows = await this.prismaService.userFollow.findMany({
      where: {
        userId: user.id,
      },
      include: {
        blockchainDomain: true,
      },
    });

    return follows.map((follow) => new UserFollowEntity(follow));
  }

  public async getFollow(userId: number, domainName: string) {
    const follow = await this.prismaService.userFollow.findFirst({
      where: {
        domainName,
        userId,
      },
      include: {
        blockchainDomain: true,
      },
    });

    return follow ? new UserFollowEntity(follow) : null;
  }

  public async createOrUpdateFollow(user: UserEntity, data: iFollowProject) {
    let follow = await this.prismaService.userFollow.findFirst({
      where: {
        domainName: data.name,
        userId: user.id,
      },
    });

    const domainEntity = await this.getDomainEntity(user, follow, data);
    this.checkBalanceForFollow(user, follow, data, domainEntity);

    if (!follow) {
      follow = await this.prismaService.userFollow.create({
        data: {
          domainName: data.name,
          isPin: data.isPin ?? false,
          maxBid: data.maxBid,
          userId: user.id,
          onPause: data.onPause ?? false,
        },
      });
      if (domainEntity.status == 'follow') {
        await this.prismaService.blockchainDomain.update({
          where: {
            id: domainEntity.id,
          },
          data: {
            status: 'booked',
          },
        });
      }
    } else {
      if (follow.onPause !== data.onPause) {
        const userBalance = SharedService.getUserBalance(user);
        if (new Big(data.maxBid ?? 0).gte(userBalance)) {
          throw new HttpException(
            "You can't start following this domain again. Not enough balance",
            400,
          );
        }
      }
      follow = await this.prismaService.userFollow.update({
        where: {
          id: follow.id,
        },
        data: {
          ...follow,
          maxBid: data.maxBid,
          onPause: data.onPause,
          isPin: data.isPin,
        },
      });
    }

    return follow;
  }

  async getDomainEntity(user, follow, data) {
    let domainEntity = await this.prismaService.blockchainDomain.findFirst({
      where: {
        name: data.name,
      },
    });

    if (!domainEntity) {
      domainEntity = await this.prismaService.blockchainDomain
        .create({
          data: {
            name: data.name,
            status: 'follow',
            userId: user.id,
          },
        })
        .catch((err) => {
          Logger.error('Magic error white create new domain', {
            err: err,
          });
          throw new Error('Magic error Domain create');
        });
    }

    return domainEntity;
  }

  checkBalanceForFollow(user, follow, data, domainEntity) {
    if (
      !follow &&
      new Big(data.maxBid).gt(SharedService.getUserBalance(user))
    ) {
      throw new HttpException('Not enough balance', 400);
    }

    if (
      follow &&
      new Big(data.maxBid).gt(
        SharedService.getUserBalance(user).plus(follow.maxBid),
      )
    ) {
      throw new HttpException('Not enough balance', 400);
    }

    const highloadWalletAddress = this.configService.get(
      'app.blockchain.walletHighload',
    );
    const currentBid = domainEntity?.currentBid ?? 0;
    const isMyBid =
      domainEntity?.userId == follow?.userId &&
      domainEntity.currentAddress == highloadWalletAddress;
    if (follow && isMyBid && new Big(currentBid).gte(data.maxBid)) {
      throw new HttpException(
        "MaxBid can't be less than current your bid",
        400,
      );
    }

    if (
      follow &&
      domainEntity.currentBid &&
      new Big(domainEntity.currentBid).gte(
        SharedService.getUserBalance(user).plus(follow.maxBid ?? 0),
      )
    ) {
      throw new HttpException('Not enough balance for update follow', 400);
    }
  }
}
