import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainDomainEntity } from './blockchainDomain.entity';
import { UserService } from '../user/user.service';
import { UserEntity } from '../user/user.entity';
import { TransformInterceptor } from '../../interceptors';
import { ConfigService } from '@nestjs/config';
import { Auth, User } from '../../decorators';
import { DomainsService } from './domains.service';
import { FollowService } from '../user/follow.service';

export interface iFollowNewProject {
  userId: number;
  domainName: string;
  maxBid: number;
  isPin?: boolean;
  onPause?: boolean;
}

@Controller('domains')
@UseInterceptors(new TransformInterceptor())
export class DomainsController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly followService: FollowService,
    private readonly configService: ConfigService,
    private readonly domainService: DomainsService,
  ) {}

  @Get('status')
  async status(@Req() req: Request) {
    const domainName = String(req.query.domain);
    const domain = await this.prismaService.blockchainDomain.findFirst({
      where: {
        name: domainName,
      },
    });

    if (!domain) {
      const entity = new BlockchainDomainEntity(domain);
      entity.name = domainName;

      return entity.toResponse();
    }

    return new BlockchainDomainEntity(domain).toResponse();
  }

  @Get('status2')
  async statusOnChain(@Req() req: Request) {
    const domainName = String(req.query.domain);

    const entity = await this.domainService
      .syncOneDomain(
        new BlockchainDomainEntity({
          name: domainName,
        }),
        false,
      )
      .catch((err) => {
        Logger.error("Can't sync on-chain. Lite server timeout", {
          domainName: domainName,
          err,
        });
        throw new HttpException(
          "Can't sync on-chain. Lite server timeout",
          400,
        );
      });

    return entity.toResponse();
  }

  @Auth()
  @Get('follow-one')
  async getOneFollowedByUser(
    @User() userParam: UserEntity,
    @Req() req: Request,
  ) {
    const userId = userParam.id;
    const domainName = req.query.domainName as string;

    if (!userId || !domainName) {
      return 'Nope';
    }

    const user = await this.prismaService.user
      .findUnique({
        where: {
          id: userId,
        },
      })
      .catch((err) => {
        Logger.error("Can't find user by id", {
          ...err,
        });
      });

    if (!user) {
      Logger.error("Can't detect user");
      return 'Nope';
    }

    const follow = await this.followService.getFollow(userId, domainName);

    if (!follow) {
      return 'Nope';
    }

    const address = this.configService.get('app.blockchain.walletHighload');

    let isOwner = false;

    if (
      follow.blockchainDomain.userId == user.id &&
      (follow.blockchainDomain.currentAddress == address ||
        follow.blockchainDomain.currentAddress == user.walletAddress)
    ) {
      isOwner = true;
    }

    return {
      ...follow.toApiResponse(),
      isOwner,
    };
  }

  @Auth()
  @Get('follow')
  async getAllFollowsByUser(@User() user: UserEntity) {
    if (!user) {
      Logger.error("Can't detect user in follow action");
      return 'Nope';
    }

    const follows = await this.followService.getFollows(new UserEntity(user));
    const address = this.configService.get('app.blockchain.walletHighload');

    return follows.map((follow) => {
      let isOwner = false;
      if (
        follow.blockchainDomain.userId == user.id &&
        (follow.blockchainDomain.currentAddress == address ||
          follow.blockchainDomain.currentAddress == user.walletAddress)
      ) {
        isOwner = true;
      }
      return {
        ...follow.toApiResponse(),
        isOwner,
      };
    });
  }

  @Auth()
  @Post('follow')
  async createOrUpdateFollowByUser(
    @User() user: UserEntity,
    @Body() data: iFollowNewProject,
  ) {
    if (!user) {
      Logger.error("Can't detect user");
      return 'Nope';
    }

    if (!data.domainName || !data.maxBid) {
      throw new HttpException(
        'Impossible to create without domain name or maxBid',
        400,
      );
    }

    const result = await this.followService
      .createOrUpdateFollow(new UserEntity(user), {
        name: data.domainName.toLowerCase(),
        maxBid: String(data.maxBid),
        isPin: data.isPin ?? false,
        onPause: data.onPause ?? false,
      })
      .catch((err) => {
        Logger.error("Can't create/update follow for user", {
          err,
        });
        throw new HttpException('Error while create, try again', 400);
      });

    /*    this.domainService
          .buyBooked()
          .then(() =>
            this.domainService
              .syncAuctionAddresses()
              .then(() => Logger.log('Manual sync is finished')),
          );*/

    this.userService
      .updateAmount()
      .then(() => {
        Logger.log('Updated blocked amount after created follow');
      })
      .catch((err) => {
        Logger.error('Error while update blocked amount ', {
          err,
        });
      });

    return result;
  }

  @Auth()
  @Delete('follow/:name')
  async deleteFollow(@User() user: UserEntity, @Param('name') domain: string) {
    const address = this.configService.get('app.blockchain.walletHighload');
    const follow = await this.prismaService.userFollow.findFirst({
      where: {
        domainName: domain,
        userId: user.id,
      },
      include: {
        blockchainDomain: true,
      },
    });

    const statuses = ['auction', 'sold'];
    if (
      follow.blockchainDomain.currentAddress == address &&
      follow.blockchainDomain.userId == follow.userId &&
      statuses.includes(follow.blockchainDomain.status)
    ) {
      throw new HttpException(
        "You are own domain and can't stop/delete it",
        400,
      );
    }

    await this.prismaService.userFollow
      .deleteMany({
        where: {
          domainName: domain,
          userId: user.id,
        },
      })
      .catch((err) => {
        Logger.error("Can't delete follow", {
          err,
        });
        throw new HttpException(
          'Something happens with delete, try later. Sorry',
          400,
        );
      });

    const sameNameDomain = await this.prismaService.userFollow.findFirst({
      where: {
        domainName: domain,
      },
    });

    if (!sameNameDomain) {
      await this.prismaService.blockchainDomain.update({
        where: {
          name: domain,
        },
        data: {
          userId: null,
        },
      });
    }

    return true;
  }

  @Auth()
  @Get('domains-by-address')
  async myNotManagedDomains(@Req() req: Request) {
    const userId = Number(req.query.userId);

    if (!userId) {
      return 'Nope';
    }

    const user = await this.prismaService.user
      .findUnique({
        where: {
          id: userId,
        },
      })
      .catch((err) => {
        Logger.error("Can't find user by id", {
          ...err,
        });
      });

    if (!user) {
      Logger.error("Can't detect user in follow action");
      return 'Nope';
    }

    const domains = await this.prismaService.blockchainDomain.findMany({
      where: {
        OR: [
          {
            currentAddress: user.walletAddress,
          },
          {
            ownerAddress: user.walletAddress,
          },
        ],
      },
    });

    return domains.map((domain) => new BlockchainDomainEntity(domain));
  }
}
