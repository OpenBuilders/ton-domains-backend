import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { TokenEntity } from './token.entity';

@Injectable()
export class AuthTokenService {
  constructor(private readonly prismaService: PrismaService) {}

  create(userId: number, type: string, token: string) {
    return this.prismaService.token.create({
      data: {
        userId,
        type,
        token,
      },
    });
  }

  findByQuery(query: { userId?: number; type?: string; token?: string }) {
    return this.prismaService.token.findMany({
      where: query,
    });
  }

  async findByTokenAndType(token: string, type: string) {
    if (!token) return null;
    return new TokenEntity(
      await this.prismaService.token.findFirst({
        where: {
          token,
          type,
        },
      }),
    );
  }

  findAllByType(type: string) {
    return this.prismaService.token.findMany({
      where: {
        type,
      },
    });
  }

  async oneTimeFindToken(token: string, type: string) {
    const tokenEntity = await this.findByTokenAndType(token, type);

    if (Object.keys(tokenEntity).length === 0) {
      Logger.log('[Strange behavior] User not found by token', {
        token,
        type,
      });
      return null;
    }

    try {
      await this.deleteTokenByToken(token);
    } catch (err) {
      return null;
    }

    return tokenEntity;
  }

  deleteOne(id: number) {
    return this.prismaService.token.delete({
      where: {
        id: id,
      },
    });
  }

  deleteTokenByToken(token: string) {
    return this.prismaService.token.delete({
      where: {
        token,
      },
    });
  }

  async deleteTokensByUserIdAndType(query: {
    userId?: number;
    type?: string;
    token?: string;
  }) {
    return this.prismaService.token.deleteMany({
      where: query,
    });
  }
}
