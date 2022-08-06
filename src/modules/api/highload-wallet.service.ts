import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, BOC, Builder, Cell, Coins, Mnemonic, Providers } from 'ton3';
import { Wallets } from 'ton3-contracts';
import { atob } from 'buffer';
import { ContractHighloadWalletV2 } from 'ton3-contracts/dist/wallets';

export interface iTransaction {
  amount: string;
  message: string | Cell | null;
  destination: string;
  isNano: boolean;
}

export interface iTransferDomain extends iTransaction {
  params: {
    newOwnerAddress: string;
    responseAddress: string;
    forwardAmount?: string;
    forwardPayload?: Uint8Array | number[];
    queryId?: number | null;
  };
}

@Injectable()
export class HighloadWalletService implements OnModuleInit {
  /**
   * @var tonweb Tonweb
   * @private
   */
  private highload: ContractHighloadWalletV2;
  private client: any;
  // private client: ClientRESTV2;
  private mnemonic: Mnemonic;

  constructor(private readonly configService: ConfigService) {}

  private static generateQueryId(timeout: number, randomId?: number): bigint {
    const now = Math.floor(Date.now() / 1000);
    const random = randomId || Math.floor(Math.random() * Math.pow(2, 30));

    return (BigInt(now + timeout) << 32n) | BigInt(random);
  }

  async onModuleInit(): Promise<any> {
    const endpoint = this.configService.get('app.toncenter.host');
    const provider = new Providers.ProviderRESTV2(endpoint);
    this.client = await provider.client();
    const mnemonicBase64 = this.configService.get(
      'app.blockchain.walletHighloadMnemonic',
    );
    const mnemonicArray = atob(mnemonicBase64).split(',');
    this.mnemonic = new Mnemonic(mnemonicArray);
    this.highload = new Wallets.ContractHighloadWalletV2(
      0,
      this.mnemonic.keys.public,
    );
  }

  async transfer(transactions: iTransaction[]) {
    const formattedTransactions = [];

    if (transactions.length === 0) {
      Logger.warn('Empty transactions in HIGHLOAD');
      return;
    }
    transactions.map((transaction) => {
      let body = transaction?.message ?? '';
      if (typeof body === 'object') {
        body = transaction.message;
      } else {
        body = new Builder()
          .storeUint(0, 32)
          .storeString(<string>transaction.message ?? '')
          .cell();
      }
      formattedTransactions.push({
        destination: new Address(transaction.destination),
        amount: new Coins(transaction.amount, transaction.isNano),
        body: body,
        mode: 3,
      });
    });

    Logger.debug('Highlaod Transactions', {
      length: formattedTransactions.length,
    });

    const transfers = Array(formattedTransactions.length)
      .fill(null)
      .reduce((acc, _el) => acc.concat(formattedTransactions.pop()), []);

    const payments = this.highload
      .createTransferMessage(
        transfers,
        false,
        40,
        HighloadWalletService.generateQueryId(40),
      )
      .sign(this.mnemonic.keys.private);

    const {
      data: paymentsData,
      headers,
      config,
    } = await this.client.sendBoc(null, {
      boc: BOC.toBase64Standard(payments),
    });
    Logger.log('Output highload transactions', {
      paymentsData: paymentsData,
      headers: headers,
      config,
    });

    return paymentsData;
  }

  async transferDomain(transactions: iTransferDomain[]) {
    const data = transactions.map((item) => {
      const cell = new Builder();
      cell.storeUint(0x5fcc3d14, 32); // transfer op
      cell.storeUint(item.params.queryId || 0, 64);
      cell.storeAddress(new Address(item.params.newOwnerAddress));
      cell.storeAddress(new Address(item.params.responseAddress));
      cell.storeBit(0); // null custom_payload
      cell.storeCoins(
        new Coins(item.params.forwardAmount, false) || new Coins(0, false),
      );
      cell.storeBit(0); // forward_payload in this slice, not separate cell
      if (item.params.forwardPayload) {
        cell.storeBytes(item.params.forwardPayload);
      }

      return {
        destination: item.destination,
        amount: item.amount,
        isNano: item.isNano,
        message: cell.cell(),
      };
    });

    await this.transfer(data);
  }
}
