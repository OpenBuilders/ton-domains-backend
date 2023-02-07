import { Injectable } from '@nestjs/common';
import Big from 'big.js';

@Injectable()
export class SharedService {
  static getMinBidByName(domain: string): string {
    switch (domain.length) {
      case 4:
        return '531441000000';
      // absolute min 100
      case 5:
        return '265720500000';
      // absolute min 50
      case 6:
        return '212576400000';
      // absolute min 40
      case 7:
        return '159432300000';
      // absolute min 30
      case 8:
        return '106288200000';
      // absolute min 20
      case 9:
        return '53144100000';
      // absolute min 10
      case 10:
        return '26572050000';
      // absolute min 5
      default:
        return '5314410000';
      // absolute min 1
    }
  }

  static getNextBid(bid: string | number = 0) {
    return new Big(bid)
      .mul(0.05)
      .plus(bid)
      .plus(new Big(0.001).mul(1000000000));
  }

  static getUserBalance(userEntity): Big {
    if (!userEntity) {
      return new Big(0);
    }

    return new Big(userEntity.balance ?? 0)
      .minus(userEntity.blockedAmount ?? 0)
      .minus(userEntity.spentAmount ?? 0)
      .minus(userEntity.withdrawalAmount ?? 0);
  }
}
