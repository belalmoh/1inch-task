import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { GasService } from './gas.service';
import { LoggingInterceptor } from 'src/common/interceptors/logging';

@Controller()
@UseInterceptors(LoggingInterceptor)
export class GasController {
    constructor(private readonly gasService: GasService) { }

    @Get('gasPrice')
    async getGasPrice() {
        return this.gasService.getGasPrice();
    }
}
