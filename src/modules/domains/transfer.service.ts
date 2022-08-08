import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ApiService } from '../api/api.service';
import { ConfigService } from '@nestjs/config';
import { iTransferDomain } from '../api/highload-wallet.service';
import { DomainsService } from './domains.service';

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
        user: {
          NOT: {
            walletAddress: null,
          },
        },
      },
      include: {
        user: true,
      },
      take: 10,
    });

    const transactions: iTransferDomain[] = ownedDomains.map((domain) => {
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
      filteredDomains: ownedDomains.length,
    });
  }

  async syncAlreadyTransfers() {
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
        user: {
          NOT: {
            walletAddress: null,
          },
        },
      },
      include: {
        user: true,
      },
      take: 10,
    });

    for (const ownedDomain of ownedDomains) {
      const data = await this.apiService
        .getDnsItemInfo(ownedDomain.auctionAddress)
        .catch((err) => {
          Logger.error('Sync one domain is failed', err);
          return null;
        });

      if (!data) {
        continue;
      }

      if (data?.ownerAddress) {
        await this.prismaService.blockchainDomain
          .update({
            where: {
              id: ownedDomain.id,
            },
            data: {
              ownerAddress: data.ownerAddress,
            },
          })
          .then(() => Logger.log('Owner of transferred domain is updated'))
          .catch((err) =>
            Logger.error('Owner of transferred domain update is failed', {
              err,
            }),
          );
      }
    }
  }
}
