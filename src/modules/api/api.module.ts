import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApiService } from './api.service';
import { TonwebService } from './tonweb.service';
import { HighloadWalletService } from './highload-wallet.service';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [ApiService, TonwebService, HighloadWalletService],
  exports: [ApiService],
})
export class ApiModule {}
