import { Module } from '@nestjs/common';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';
import { LoggingInterceptor } from '../common/interceptors/logging';

@Module({
  controllers: [UniswapController],
  providers: [UniswapService, LoggingInterceptor]
})
export class UniswapModule { }
