import { Prisma, Token } from '@prisma/client';

export class TokenEntity implements Token {
  id: number;
  type: string;
  userId: number;
  token: string;
  createdAt: Date;
  payload: Prisma.JsonValue = undefined;

  constructor(partial: Partial<TokenEntity>) {
    Object.assign(this, partial);
  }
}

export enum TokenType {
  tonAuthSession = 'ton-auth-session',
}
