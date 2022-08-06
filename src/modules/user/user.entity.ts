import { User } from '@prisma/client';

export class UserEntity implements User {
  id: number;
  walletAddress: string | null;
  state: string | null;
  telegramId: string | null;
  maxBid: string | null;
  balance: string | null;
  spentAmount: string | null = '0';
  takedAmount: string | null = '0'; // @deprecated
  withdrawalAmount: string | null = '0';
  blockedAmount: string | null = '0';
  onBlock: boolean;
  createdAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }

  toPrisma() {
    return {
      id: this.id,
      maxBid: this.maxBid,
      state: this.state,
      telegramId: this.telegramId,
      balance: this.balance,
      spentAmount: this.spentAmount,
      takedAmount: this.takedAmount,
      withdrawalAmount: this.withdrawalAmount,
      blockedAmount: this.blockedAmount,
      onBlock: this.onBlock,
      walletAddress: this.walletAddress,
      createdAt: this.createdAt,
    };
  }

  getModelData() {
    return {
      id: this.id,
      telegramId: this.telegramId,
      walletAddress: this.walletAddress,
      createdAt: this.createdAt,
    };
  }
}
