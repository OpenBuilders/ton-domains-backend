import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
