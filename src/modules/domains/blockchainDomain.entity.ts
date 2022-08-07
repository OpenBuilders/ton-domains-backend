import { BlockchainDomain, UserFollow } from '@prisma/client';
import Big from 'big.js';
import { SharedService } from '../shared/shared.service';

export type statuses = 'booked' | 'processing' | 'sync' | 'auction' | 'sold';

export class BlockchainDomainEntity implements BlockchainDomain {
  id: number;
  initiatorAddress: string;
  auctionAddress: string | null;
  ownerAddress: string | null;
  name: string;

  lt: string;
  transactionHash: string;
  isValid: boolean;
  isSynced: boolean;
  isCounted: boolean;

  status: statuses | string | null = 'booked';
  currentAddress: string | null;
  currentBid: string | null;
  userId: number | null;

  lastBidAt: Date | null;
  finishAt: Date | null;
  createdAt: Date;

  UserFollow?: UserFollow[] | null;

  constructor(partial: Partial<BlockchainDomainEntity>) {
    Object.assign(this, partial);
  }

  public toPrisma() {
    return {
      ...this,
      UserFollow: undefined,
      user: undefined,
    };
  }

  public toResponse() {
    let nextBid = '';

    if (this.currentBid) {
      const currentBid = new Big(this.currentBid ?? 0).mul(0.05);
      nextBid = currentBid
        .plus(this.currentBid ?? 0)
        .plus(new Big(0.001).mul(1000000000))
        .toFixed(0);
    } else {
      nextBid = this.name ? SharedService.getMinBidByName(this.name) : '0';
    }

    return {
      id: this.id,
      initiatorAddress: this.initiatorAddress,
      auctionAddress: this.auctionAddress,
      status: this.status === 'booked' ? 'new' : this.status, // TODO: New status here? Changes on FE
      currentAddress: this.currentAddress,
      currentBid: this.currentBid,
      nextBid: nextBid,
      finishAt: this.finishAt,
      lastBidAt: this.lastBidAt,
      createdAt: this.createdAt,
    };
  }
}
