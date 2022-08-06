import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('server.jwtSecret'),
    });
  }

  public async validate(payload: { userId: number }, done) {
    const user = await this.userService.findById(payload.userId);

    if (!user) {
      return done(
        new HttpException('invalid-authorization', HttpStatus.UNAUTHORIZED),
        false,
      );
    }

    done(null, user);
  }
}
