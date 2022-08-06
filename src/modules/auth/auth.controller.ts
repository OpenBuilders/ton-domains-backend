import {
  Controller,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { TransformInterceptor } from 'src/interceptors';
import { AuthRequestTypes, TonConnectServer } from '@tonapps/tonconnect-server';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { Auth, User } from 'src/decorators';
import { UserEntity } from '../user/user.entity';
import { AuthTokenService } from './user-token.service';
import { TokenType } from './token.entity';

export interface LoginTokenInterface {
  token: string;
}

@Controller('auth')
@UseInterceptors(new TransformInterceptor())
export class AuthController {
  private readonly tonAuthSecret: string;

  constructor(
    private readonly authService: AuthService,
    private readonly authTokenService: AuthTokenService,
    private readonly configService: ConfigService,
  ) {
    this.tonAuthSecret = this.configService.get('app.tonAuth.secret');
  }

  @Get('wallet-session')
  async walletSession(@Query('token') token: string) {
    if (!token) {
      throw new HttpException("Can't find session", 400);
    }

    const loginData = await this.authService.loginBySessionToken(token);

    if (!loginData) {
      throw new HttpException("Can't find session", 400);
    }

    await this.authService.deleteToken(token).catch((err) => {
      Logger.error("Can't delete auth token", {
        err,
      });
    });

    return {
      address: loginData.walletAddress,
      accessToken: loginData.credentials.accessToken,
      refreshToken: loginData.credentials.refreshToken,
    };
  }

  @Get('ton-login')
  async tonLogin(@Query('tonlogin') tonlogin: string) {
    const tonconnect = new TonConnectServer({
      staticSecret: this.tonAuthSecret,
    });

    try {
      const response = tonconnect.decodeResponse(tonlogin);

      let address = '';
      let token = '';
      let tgUserId = '';

      if (response.sessionData && response.sessionData.tgUserId) {
        tgUserId = response.sessionData.tgUserId;
      }

      if (response.sessionData && response.sessionData.sessionToken) {
        token = response.sessionData.sessionToken;
      }

      for (const payload of response.payload) {
        switch (payload.type) {
          case AuthRequestTypes.ADDRESS:
            address = payload.address;
            break;
        }
      }

      if (address && token && tgUserId) {
        const user = await this.authService.getOrCreateUserByFriendlyAddress({
          telegramId: tgUserId,
          walletAddress: address,
        });
        Logger.debug('CREATE AUTH TOKEN', {
          address,
        });
        await this.authService.createTonAuthToken({
          token,
          userId: user.id,
        });
      }

      return { error: false };
    } catch (err) {
      return { error: true };
    }
  }

  @Get('ton-auth-request/:token/:tgUserId')
  tonAuthRequest(
    @Param('token') token: string,
    @Param('tgUserId') tgUserId: string,
  ) {
    const callback_url = `https://${this.configService.get(
      'app.tonAuth.apiHost',
    )}/api/auth/ton-login`;

    const tonconnect = new TonConnectServer({
      staticSecret: this.tonAuthSecret,
    });
    const request = tonconnect.createRequest(
      {
        callback_url,
        image_url: 'https://cdn.rocketon.dev/projects/rocketon-icon.png',
        items: [
          {
            type: AuthRequestTypes.ADDRESS,
            required: true,
          },
          {
            type: AuthRequestTypes.OWNERSHIP,
            required: true,
          },
        ],
      },
      {
        sessionToken: token,
        tgUserId: tgUserId,
      },
    );

    return request;
  }

  @Auth()
  @Post('signout')
  async signout(@User() user: UserEntity) {
    Logger.log('signout', user.id);

    await this.authTokenService.deleteTokensByUserIdAndType({
      userId: user.id,
      type: TokenType.tonAuthSession,
    });

    return true;
  }

  // @Get('ton-auth-request/connect/:token')
  // tonHubAuthRequest() {
  //   return {
  //     state: 'initing',
  //     name: 'Tonstarter',
  //     url: 'https://tonstarter.com/',
  //   };
  // }
}
