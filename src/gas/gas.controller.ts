import { Controller, Get, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { GasService } from './gas.service';
import { LoggingInterceptor } from '@common/interceptors/logging';
import { ApiResponse } from '@nestjs/swagger';
import { GasPriceResponseDto } from '@common/dto/gas.dto';

@Controller()
@UseInterceptors(LoggingInterceptor)
export class GasController {
    constructor(private readonly gasService: GasService) { }

    @Get('gasPrice')
    @HttpCode(HttpStatus.OK)
    @ApiResponse({ status: 200, description: 'Gas price fetched successfully', type: GasPriceResponseDto })
    async getGasPrice() {
        return this.gasService.getGasPrice();
    }
}
