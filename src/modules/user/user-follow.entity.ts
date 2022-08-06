import { UserFollow } from '@prisma/client';
import { BlockchainDomainEntity } from '../domains/blockchainDomain.entity';

export class UserFollowEntity implements UserFollow {
  id: number;
  userId: number;
  domainName: string;
  maxBid: string | null;
  nextBid: string | null;
  onPause: boolean;
  isPin: boolean;
  isCounted: boolean;
  createdAt: Date;
  lastTransactionTime: Date | null = null;
  outbidDatetime: Date | null = null;

  blockchainDomain: BlockchainDomainEntity | null;

  constructor(partial: Partial<UserFollow>) {
    Object.assign(this, partial);
  }

  toPrisma() {
    return {
      userId: this.userId,
      domainName: this.domainName,
      maxBid: this.maxBid,
      onPause: this.onPause,
      isPin: this.isPin,
      isCounted: this.isCounted,
      createdAt: this.createdAt,
    };
  }

  toApiResponse() {
    const data = {
      userId: this.userId,
      domainName: this.domainName,
      maxBid: this.maxBid,
      onPause: this.onPause,
      isPin: this.isPin,
      createdAt: this.createdAt,

      status: null,
      currentBid: null,
      ownerAddress: null,
      finishAt: null,
    };

    if (this.blockchainDomain) {
      data.status = this.blockchainDomain.status;
      data.ownerAddress = this.blockchainDomain.currentAddress;
      data.currentBid = this.blockchainDomain.currentBid;
      data.finishAt = this.blockchainDomain.finishAt;
    }

    return data;
  }
}
