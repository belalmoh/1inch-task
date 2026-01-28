import { Controller, Get, HttpCode, Param, UseInterceptors } from '@nestjs/common';
import { UniswapService } from './uniswap.service';
import { EstimatedAmountOutResponseDto, EstimatedAmountOutRequestDto } from '@common/dto/uniswap.dto';
import { LoggingInterceptor } from '@common/interceptors/logging';
import { ApiResponse } from '@nestjs/swagger';

@Controller()
@UseInterceptors(LoggingInterceptor)
export class UniswapController {
    constructor(private readonly uniswapService: UniswapService) { }

    @Get('/return/:fromTokenAddress/:toTokenAddress/:amountIn')
    @HttpCode(200)
    @ApiResponse({ status: 200, description: 'Estimated amount out fetched successfully', type: EstimatedAmountOutResponseDto })
    async getEstimatedAmountOut(
        @Param() params: EstimatedAmountOutRequestDto
    ): Promise<EstimatedAmountOutResponseDto> {
        return this.uniswapService.getEstimatedAmountOut(params.fromTokenAddress, params.toTokenAddress, params.amountIn);
    }
}
