import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ApiService } from '../api/api.service';
import { ConfigService } from '@nestjs/config';
import Big from 'big.js';
import { SharedService } from '../shared/shared.service';

@Injectable()
export class BookService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly apiService: ApiService,
    private readonly configService: ConfigService,
  ) {
  }

  async buyBooked() {
    const userFollows = await this.prismaService.userFollow.findMany({
      where: {
        blockchainDomain: {
          status: 'booked',
        },
      },
      include: {
        blockchainDomain: true,
        user: true,
      },
      take: 150,
    });

    const { transactions, domainsToUpdate } =
      this.prepareTransactionsForBooking(userFollows);

    const state = await this.apiService
      .highloadTransfer(transactions)
      .catch((err) => {
        Logger.error('buyBooked failed', {
          err: err,
        });
        return false;
      });

    if (state == false) {
      return;
    }
    const ids = domainsToUpdate.map((item) => item.id);
    await this.updateBookedStatus(ids);
  }

  private prepareTransactionsForBooking(userFollows: any[]) {
    const collectionAddress = this.configService.get(
      'app.blockchain.walletAuction',
    );
    const transactions = [];
    const domainsToUpdate = [];

    userFollows.map((userFollow) => {
      const tonAmount = SharedService.getMinBidByName(
        userFollow.blockchainDomain.name,
      );

      const newBid = new Big(tonAmount).toFixed(0);
      const userBalance = SharedService.getUserBalance(userFollow?.user);
      const userBalanceEnough = userBalance
        .plus(userFollow.maxBid)
        .gte(new Big(newBid));
      const userMaxBidMoreThanMin = new Big(userFollow.maxBid).gte(
        new Big(newBid),
      );

      if (userBalanceEnough && userMaxBidMoreThanMin) {
        domainsToUpdate.push(userFollow);
        transactions.push({
          destination: collectionAddress,
          amount: newBid,
          isNano: true,
          message: userFollow.blockchainDomain.name,
        });
      } else {
        this.notEnoughForBook(userFollow, newBid);
      }
    });

    return {
      transactions,
      domainsToUpdate,
    };
  }

  private notEnoughForBook(userFollow: any, newBid: string) {
    const userId = userFollow?.user?.id;
    if (!userId) return;

    this.prismaService.userFollow
      .updateMany({
        where: {
          userId: userId,
          domainName: userFollow.blockchainDomain.name,
        },
        data: {
          nextBid: newBid,
        },
      })
      .then(() => {
        Logger.log("User haven't enough balance for make a first BID");
      })
      .catch((err) => {
        Logger.error('Just safe nodejs of dead', {
          err: err,
        });
      });
  }

  private async updateBookedStatus(ids: number[]) {
    await this.prismaService.blockchainDomain.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        status: 'processing',
      },
    });
  }
}
