import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiService } from '../api/api.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import Big from 'big.js';

@Injectable()
export class BalanceService extends PrismaClient {
  constructor(
    private readonly apiSerivce: ApiService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  async syncTopups(limit = 500) {
    const address = this.configService.get('app.blockchain.walletHighload');
    const transactions = await this.apiSerivce.getLastTransactions(
      address,
      limit,
    );
    const filteredTransaction = transactions.filter((transaction) => {
      const in_msg = transaction.in_msg;
      return (
        transaction?.out_msgs?.length === 0 && in_msg && in_msg.source != ''
      );
    });

    const storedTransactions =
      await this.prismaService.balanceTransactions.findMany({
        select: {
          transactionHash: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 30,
      });
    const hashes = storedTransactions.map(
      (sTransaction) => sTransaction.transactionHash,
    );

    let skips = 0;
    const queries = [];
    filteredTransaction.forEach((item) => {
      if (skips > 25) {
        return;
      }
      if (hashes.includes(item.transaction_id.hash)) {
        skips++;
        return;
      }
      queries.push(
        this.prismaService.balanceTransactions
          .create({
            data: {
              transactionHash: item.transaction_id.hash,
              amount: item.in_msg.value,
              walletAddress: item.in_msg.source,
            },
          })
          .catch((err) => {
            // Logger.error('Balance transaction store failed', {
            //   err: err,
            // });
          }),
      );
    });
    await Promise.all(queries);

    this.updateUserBalance().then(() => {
      Logger.log('Balance is updated');
    });
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateUserBalance() {
    const wallets = await this.prismaService.user.findMany({
      where: {
        NOT: [
          {
            walletAddress: null,
          },
        ],
      },
      select: {
        walletAddress: true,
      },
    });
    const userWallets = wallets.map((wallet) => wallet.walletAddress);
    const topups = await this.balanceTransactions.findMany({
      where: {
        walletAddress: {
          in: userWallets,
        },
        isCounted: false,
      },
    });

    const balances = {};
    const commission = 500000000;
    topups.forEach((item) => {
      const balance = new Big(balances[item.walletAddress] ?? 0);

      if (balance) {
        let transactionAmount = balance.plus(item.amount ?? 0);

        if (new Big(item.amount ?? 0).gte(commission)) {
          transactionAmount = transactionAmount.minus(commission);
        }

        balances[item.walletAddress] = transactionAmount.toFixed(0);
      } else {
        let tranAmount = new Big(item.amount ?? 0);

        if (tranAmount.gte(commission)) {
          tranAmount = tranAmount.minus(commission);
        }

        balances[item.walletAddress] = tranAmount.toFixed(0);
      }
    });

    for (const balancesKey in balances) {
      await this.prismaService.user
        .updateMany({
          where: {
            walletAddress: balancesKey,
          },
          data: {
            balance: String(balances[balancesKey]),
          },
        })
        .catch((err) => {
          Logger.error('Catch error while saving', { err });
        });
    }
  }
}
