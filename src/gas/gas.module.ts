import { Module } from '@nestjs/common';
import { GasController } from './gas.controller';
import { GasService } from './gas.service';
import { LoggingInterceptor } from '@common/interceptors/logging';

@Module({
  controllers: [GasController],
  providers: [GasService, LoggingInterceptor]
})
export class GasModule { }
