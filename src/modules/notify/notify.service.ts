import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainDomainEntity } from '../domains/blockchainDomain.entity';
import { UserFollowEntity } from '../user/user-follow.entity';
import Big from 'big.js';

@Injectable()
export class NotifyService {
  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private readonly prismaService: PrismaService,
  ) {}

  public sendMsg(
    telegramId: string,
    notificationType: 'maxBidLimit' | 'domainOwned',
    domainEntity: BlockchainDomainEntity,
    userFollow: UserFollowEntity,
  ) {
    const messageText = this.getMessageText(
      notificationType,
      domainEntity.name,
      userFollow,
      domainEntity,
    );

    this.sendMsgAsync(telegramId, notificationType, messageText, domainEntity)
      .then(() =>
        Logger.log(
          `User ${telegramId} has been notified about ${notificationType}`,
        ),
      )
      .catch((err) =>
        Logger.error(
          `User ${telegramId} could not be notified about ${notificationType}`,
          {
            err,
          },
        ),
      );
  }

  getMessageText(
    notificationType: string,
    domainName: string,
    userFollow: UserFollowEntity,
    domainEntity: BlockchainDomainEntity,
  ): string {
    const userMaxBid = new Big(userFollow.maxBid ?? 0)
      .div(1000000000)
      .toFixed(2);
    const currentBid = new Big(domainEntity.currentBid ?? 0)
      .div(1000000000)
      .toFixed(2);
    switch (notificationType) {
      case 'maxBidLimit':
        return `Hey mate, enlarge your max bid for <b>${domainName}</b> - now it's <b>${userMaxBid}</b>, or someone else gonna take it with currentBid - ${currentBid}`;
      case 'domainOwned':
        return `Congrats 🎉\n<b>${domainName}</b> is yours with bid - ${currentBid}`;
    }
  }

  private async sendMsgAsync(
    telegramId: string,
    notificationType: string,
    message: string,
    domain: BlockchainDomainEntity,
  ) {
    const entity = await this.prismaService.notifications.findFirst({
      where: {
        domainName: domain.name,
        type: notificationType,
        currentBid: domain.currentBid,
      },
    });

    if (entity) {
      return;
    } else {
      await this.prismaService.notifications.create({
        data: {
          domainName: domain.name,
          type: notificationType,
          userId: telegramId,
          currentBid: domain.currentBid,
        },
      });
    }

    await this.bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
    });
  }
}
