import { ApiProperty } from "@nestjs/swagger";

export class GasPriceResponseDto {
    @ApiProperty({ type: Number, example: 47888827 })
    gasPrice: number;
}