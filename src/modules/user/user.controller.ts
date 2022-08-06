import {
  Controller,
  Get,
  HttpException,
  Logger,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UserEntity } from './user.entity';
import { TransformInterceptor } from '../../interceptors';
import { Auth, User } from '../../decorators';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import Big from 'big.js';
import { ConfigService } from '@nestjs/config';
import { ApiService } from '../api/api.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SharedService } from '../shared/shared.service';

@Auth()
@Controller('user')
@UseInterceptors(new TransformInterceptor())
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly apiService: ApiService,
  ) {}

  @Get('me')
  async findOne(@User() user: UserEntity) {
    return user;
  }

  @Post('withdrawal')
  async withdrawal(@User() userData: UserEntity) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userData.id,
      },
      include: {
        UserFollow: {
          include: {
            blockchainDomain: true,
          },
        },
      },
    });

    if (
      !user.balance ||
      user.balance == '0' ||
      SharedService.getUserBalance(user).eq(0)
    ) {
      Logger.debug('Not enough balance on account');
      throw new HttpException('Not enough balance on account', 400);
    }

    if (user.onBlock) {
      throw new HttpException(
        'User balance processing by another request',
        400,
      );
    }

    user.onBlock = true;
    await this.userService.update(new UserEntity(user));

    await this.userService.updateAmountsByUser(
      user.UserFollow,
      new UserEntity(user),
    );
    const updatedUser = await this.prismaService.user.findUnique({
      where: {
        id: user.id,
      },
    });
    const previousWithdrawalValue = updatedUser.withdrawalAmount ?? '0';
    const toWithdraw = SharedService.getUserBalance(user).toFixed(0);

    // withdrawal
    user.withdrawalAmount = new Big(user.withdrawalAmount ?? 0)
      .plus(toWithdraw)
      .toFixed(0);

    user.onBlock = false;
    await this.userService.update(new UserEntity(user));

    await this.apiService
      .highloadTransfer([
        {
          amount: toWithdraw,
          message: 'Withdrawal',
          destination: user.walletAddress,
          isNano: true,
        },
      ])
      .then((req) => {
        Logger.log('Withdrawal is sent', {
          payload: req,
        });
      })
      .catch((err) => {
        this.prismaService.user
          .update({
            where: {
              id: updatedUser.id,
            },
            data: {
              onBlock: false,
              withdrawalAmount: previousWithdrawalValue,
            },
          })
          .then(() => {
            Logger.log('User return back withdrawalAmount', {
              userId: updatedUser.id,
            });
          });
        Logger.error('Withdrawal ERROR', {
          err: err,
          address: user.walletAddress,
        });
      });

    return {
      amount: toWithdraw,
      wallet: user.walletAddress,
    };
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async updateBlockAmount() {
    await this.userService.updateAmount();
  }
}
