import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ApiService } from '../api/api.service';
import { ConfigService } from '@nestjs/config';
import { iTransferDomain } from '../api/highload-wallet.service';

@Injectable()
export class TransferService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly apiService: ApiService,
    private readonly configService: ConfigService,
  ) {}

  async transferDomainsToOwners() {
    const address = this.configService.get('app.blockchain.walletHighload');
    const ownedDomains = await this.prismaService.blockchainDomain.findMany({
      where: {
        status: 'sold',
        ownerAddress: address,
        NOT: [
          {
            userId: null,
          },
        ],
      },
      include: {
        user: true,
      },
      take: 10,
    });
    const filteredDomains = ownedDomains.filter(
      (domain) => !!domain.user.walletAddress,
    );
    const transactions: iTransferDomain[] = filteredDomains.map((domain) => {
      return {
        destination: domain.auctionAddress,
        amount: '0.04',
        isNano: false,
        message: null,
        params: {
          newOwnerAddress: domain.user.walletAddress,
          responseAddress: domain.user.walletAddress,
          forwardAmount: '0.02',
          forwardPayload: new TextEncoder().encode(domain.name),
        },
      };
    });

    await this.apiService.highloadTransferDomains(transactions).catch((err) => {
      Logger.error('Transfer domain failed', {
        err: err,
      });
    });

    Logger.debug('[Transfer domain] filteredDomains', {
      filteredDomains: filteredDomains.length,
    });
    for (const filteredDomain of filteredDomains) {
      this.prismaService.blockchainDomain
        .update({
          where: {
            id: filteredDomain.id,
          },
          data: {
            initiatorAddress: filteredDomain.initiatorAddress,
            ownerAddress: filteredDomain.user.walletAddress,
            auctionAddress: filteredDomain.auctionAddress,
            transactionHash: filteredDomain.transactionHash,
            lt: filteredDomain.lt,
            isValid: filteredDomain.isValid,
            isSynced: filteredDomain.isSynced,
            status: filteredDomain.status,
            currentAddress: filteredDomain.currentAddress,
            currentBid: filteredDomain.currentBid,
            userId: filteredDomain.userId,
            lastBidAt: filteredDomain.lastBidAt,
            finishAt: filteredDomain.finishAt,
          },
        })
        .then(() => {
          Logger.log('Domain owner after transfer is updated');
        })
        .catch((err) => {
          Logger.error('Domain update failed owner of domain', {
            err: err,
            id: filteredDomain.id,
            address: filteredDomain.user.walletAddress,
          });
        });
    }
  }
}
