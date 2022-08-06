import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from 'src/modules/user/user.entity';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();
    const user =
      request.user ?? request.users; /*TODO: WTF, why it's different objects*/

    return data ? user?.[data] : user;
  },
);
