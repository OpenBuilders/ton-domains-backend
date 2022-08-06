import { Module } from '@nestjs/common';

import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { JwtStrategy } from './passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DomainsModule } from '../domains/domains.module';
import { AuthTokenService } from './user-token.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    DomainsModule,
    UserModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'users',
      session: false,
    }),

    JwtModule.register({
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthTokenService],
  controllers: [AuthController],
})
export class AuthModule {}
