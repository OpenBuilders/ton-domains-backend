import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { TonwebService } from './tonweb.service';
import {
  HighloadWalletService,
  iTransaction,
  iTransferDomain,
} from './highload-wallet.service';

@Injectable()
export class ApiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly tonwebService: TonwebService,
    private readonly highloadService: HighloadWalletService,
  ) {}

  async getStateByDomain(domain: string) {
    const address = await this.tonwebService
      .getAddressByName(domain)
      .catch((err) => {
        Logger.error('Problem with get address by name', {
          err,
        });
        throw new HttpException("Can't get address by name", 500);
      });

    if (!address) {
      return null;
    }

    const account = await this.tonwebService.getAccountState(address);
    if (account.state == 'active') {
      return {
        isActive: true,
        address,
        accountState: account,
        domainState: {
          ...(await this.tonwebService
            .getDnsDataByAddress(address)
            .catch((err) => {
              Logger.error('Error of NFT info', {
                err: err,
              });
              return null;
            })),
        },
      };
    } else {
      return {
        isActive: false,
        address,
        accountState: account,
        domainState: null,
      };
    }
  }

  async getLastTransactions(
    address,
    limit = 20,
    fromLT = undefined,
    hash = undefined,
  ) {
    return await this.tonwebService.getLastTransactions(
      address,
      limit,
      fromLT,
      hash,
    );
  }

  async highloadTransfer(transactions: iTransaction[] = []) {
    return await this.highloadService.transfer(transactions);
  }

  async highloadTransferDomains(transferDomain: iTransferDomain[]) {
    return await this.highloadService.transferDomain(transferDomain);
  }
}
