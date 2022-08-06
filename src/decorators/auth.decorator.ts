import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../modules/auth/guards';

export function Auth() {
  return UseGuards(JwtAuthGuard);
}
