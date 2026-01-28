import { IsString, IsNotEmpty } from 'class-validator';

export class EstimatedAmountOutRequestDto {
    @IsString()
    @IsNotEmpty({ message: "fromTokenAddress is required" })
    fromTokenAddress: string;

    @IsString()
    @IsNotEmpty({ message: "toTokenAddress is required" })
    toTokenAddress: string;

    @IsString()
    @IsNotEmpty({ message: "amountIn is required" })
    amountIn: string;
}

export class EstimatedAmountOutResponseDto {
    estimatedOutputAmount: string;
}