import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EstimatedAmountOutRequestDto {
    @ApiProperty({ required: true, type: String, example: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" })
    @IsString()
    @IsNotEmpty({ message: "fromTokenAddress is required" })
    fromTokenAddress: string;

    @ApiProperty({ required: true, type: String, example: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" })
    @IsString()
    @IsNotEmpty({ message: "toTokenAddress is required" })
    toTokenAddress: string;

    @ApiProperty({ required: true, type: String, example: "1000000000000000000" })
    @IsString()
    @IsNotEmpty({ message: "amountIn is required" })
    amountIn: string;
}

export class EstimatedAmountOutResponseDto {
    @ApiProperty({ type: String, example: "0.000011085363711895" })
    estimatedOutputAmount: string;
}