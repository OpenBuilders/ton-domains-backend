import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from './user.entity';
import { UserFollowEntity } from './user-follow.entity';
import Big from 'big.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
  }

  async findById(userId: string | number): Promise<UserEntity> {
    return await this.findBy({
      id: Number(userId),
    });
  }

  async findBy(where: {
    id?: number;
    telegramId?: string;
    walletAddress?: string;
  }) {
    const user = await this.prismaService.user.findFirst({
      where: where,
    });

    return user ? new UserEntity(user) : null;
  }

  async create(entity: UserEntity) {
    const newUser = await this.prismaService.user.create({
      data: entity.getModelData(),
    });

    return new UserEntity(newUser);
  }

  async update(entity: UserEntity) {
    const user = await this.prismaService.user.update({
      where: {
        id: entity.id,
      },
      data: new UserEntity(entity).toPrisma(),
    });

    return new UserEntity(user);
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

  public async updateAmount() {
    const follows = await this.prismaService.userFollow.findMany({
      where: {
        blockchainDomain: {
          status: {
            in: ['auction', 'booked', 'sync', 'sold'],
          },
        },
      },
      include: {
        blockchainDomain: true,
        user: true,
      },
    });

    const users = {};
    const userFollows = {};
    for (const follow of follows) {
      if (!users[follow.userId]) {
        users[follow.userId] = follow.user;
      }

      if (userFollows[follow.userId]) {
        userFollows[follow.userId].push(follow);
      } else {
        userFollows[follow.userId] = [follow];
      }
    }

    for (const userId in users) {
      await this.updateAmountsByUser(userFollows[userId], users[userId]);
    }

    Logger.log('Balances is updated');
  }

  async updateAmountsByUser(userFollows, user) {
    const walletAddress = this.configService.get(
      'app.blockchain.walletHighload',
    );
    const blockStatuses = ['auction', 'booked', 'sync'];
    let updatedBlockAmount = new Big(0);
    let updatedSpentAmount = new Big(0);

    for (const follow of userFollows) {
      const isBlock = blockStatuses.includes(follow.blockchainDomain?.status);
      const plus = isBlock ? follow.maxBid : follow.blockchainDomain.currentBid;

      if (isBlock) {
        updatedBlockAmount = updatedBlockAmount.plus(plus ?? 0);
      } else {
        if (
          walletAddress == follow.blockchainDomain.currentAddress &&
          follow.blockchainDomain.userId == follow.userId
        ) {
          updatedSpentAmount = updatedSpentAmount.plus(plus ?? 0);
        }
      }

      user.blockedAmount = updatedBlockAmount.toFixed(0);
      user.spentAmount = updatedSpentAmount.toFixed(0);
    }
    Logger.log('User balance going to update', {
      userId: user.id,
      blocked: user.blockedAmount,
      spent: user.spentAmount,
    });
    const userEntity = new UserEntity(user);
    await this.update(userEntity).catch((err) => {
      this.prismaService.user
        .update({
          where: {
            id: userEntity.id,
          },
          data: {
            onBlock: true,
          },
        })
        .then(() =>
          Logger.log('Block user balances because catch exception', {
            userId: userEntity.id,
          }),
        )
        .catch((err) =>
          Logger.error('Double trouble error with balances', {
            err,
            userId: userEntity.id,
          }),
        );
      Logger.error('Error while updating balances amount of user', {
        err,
        userId: userEntity.id,
      });
    });

    Logger.log('User balance is up to date', {
      userId: userEntity.id,
      spent: userEntity.spentAmount,
      blocked: userEntity.blockedAmount,
      withdrawal: userEntity.withdrawalAmount,
    });

    return user;
  }
}
