import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from 'typegram/manage';

@Injectable()
export class BotService {
  constructor(private readonly prismaService: PrismaService) {
  }

  async storeUser(telegramUser: User) {
    let user = await this.prismaService.user.findFirst({
      where: {
        telegramId: String(telegramUser.id),
      },
    });

    if (!user) {
      user = await this.prismaService.user.create({
        data: {
          telegramId: String(telegramUser.id),
          state: 'start',
        },
      });
    }

    return user;
  }
}
