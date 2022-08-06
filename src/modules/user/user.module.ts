import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UserController } from './user.controller';
import { ApiModule } from '../api/api.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FollowService } from './follow.service';

@Module({
  imports: [ConfigModule, PrismaModule, ApiModule, ScheduleModule.forRoot()],
  controllers: [UserController],
  providers: [UserService, FollowService],
  exports: [UserService, FollowService],
})
export class UserModule {
}
