import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
