import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from "./interceptors";

@Controller()
@UseInterceptors(new TransformInterceptor())
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('give-me-wallet-address')
  getWalletForTopup() {
    return this.configService.get('app.blockchain.walletHighload');
  }
}
