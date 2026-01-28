import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { UniswapService } from './uniswap.service';
import { EstimatedAmountOutResponseDto, EstimatedAmountOutRequestDto } from 'src/common/dto/uniswap.dto';
import { LoggingInterceptor } from '../common/interceptors/logging';

@Controller()
@UseInterceptors(LoggingInterceptor)
export class UniswapController {
    constructor(private readonly uniswapService: UniswapService) { }

    @Get('/return/:fromTokenAddress/:toTokenAddress/:amountIn')
    async getEstimatedAmountOut(
        @Param() params: EstimatedAmountOutRequestDto
    ): Promise<EstimatedAmountOutResponseDto> {
        return this.uniswapService.getEstimatedAmountOut(params.fromTokenAddress, params.toTokenAddress, params.amountIn);
    }
}
