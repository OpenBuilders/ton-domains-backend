import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { TokenType } from './token.entity';
import { UserService } from '../user/user.service';
import { UserEntity } from '../user/user.entity';
import { AuthTokenService } from './user-token.service';

export interface JwtCredentials {
  accessToken: string;
  refreshToken: string;
}

/* remove */
export interface TelegramAuthData {
  id: string;
  firstName: string;
  username: string;
  photoUrl: string;
  authDate: number;
  hash: string;
}

/* remove */
export interface WalletAuthData {
  phrase?: string;
  signedPhrase?: string;
  publicKey?: string;
  walletAddress: string;
  walletVersion?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly tokenService: AuthTokenService,
  ) {}

  async getOrCreateUserByFriendlyAddress({
    walletAddress,
    telegramId,
  }: {
    walletAddress: string;
    telegramId: string;
  }) {
    let user = await this.userService.findBy({
      walletAddress: walletAddress,
    });

    if (!user) {
      user = await this.userService.create(
        new UserEntity({
          walletAddress: walletAddress,
          telegramId: telegramId,
        }),
      );
    } else if (!user.walletAddress) {
      user = await this.userService.update(
        new UserEntity({
          ...user,
          walletAddress: walletAddress,
        }),
      );
    }

    return user;
  }

  generateCredentials(userId: number): JwtCredentials {
    const accessToken = this.generateJwtAccessToken(userId);
    const refreshToken = this.generateJwtRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
    };
  }

  generateJwtAccessToken(userId: number) {
    const today = new Date();
    const expire = new Date(today.getTime() + 30 * 24 * 60 * 60000);

    const payload = { userId, expire };

    Logger.log('generateJwtAccessToken', payload);
    Logger.log(this.configService.get('server.jwtSecret'));

    return this.jwtService.sign(payload, {
      secret: this.configService.get('server.jwtSecret'),
    });
  }

  generateJwtRefreshToken(userId: number) {
    const payload = { userId };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('server.jwtSecret'),
    });
  }

  async createTonAuthToken({
    token,
    userId,
  }: {
    token: string;
    userId: number;
  }) {
    return await this.prismaService.token.create({
      data: {
        userId,
        token,
        type: TokenType.tonAuthSession,
      },
    });
  }

  async findByTonAuthSessionToken(token: string): Promise<UserEntity> | null {
    const tokenEntity = await this.tokenService.findByTokenAndType(
      token,
      TokenType.tonAuthSession,
    );

    if (!tokenEntity?.id) {
      return null;
    }

    return await this.userService.findById(tokenEntity.userId);
  }

  async deleteToken(token: string) {
    await this.tokenService.deleteTokenByToken(token);
  }

  async loginBySessionToken(sessionToken: string) {
    Logger.log('loginBySessionToken', sessionToken);
    const user = await this.findByTonAuthSessionToken(sessionToken);

    if (!user) {
      return null;
    }

    Logger.log('user', user);

    return {
      walletAddress: user.walletAddress,
      credentials: this.generateCredentials(user.id),
    };
  }
}
