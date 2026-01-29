import { ConfigService } from '@nestjs/config';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ethers, BigNumber } from 'ethers';
import { EstimatedAmountOutResponseDto } from '@common/dto/uniswap.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

// Uniswap V2 Factory ABI (only getPair function)
const FACTORY_ABI = [
	{
		"constant": true,
		"inputs": [
			{ "internalType": "address", "name": "", "type": "address" },
			{ "internalType": "address", "name": "", "type": "address" }
		],
		"name": "getPair",
		"outputs": [{ "internalType": "address", "name": "", "type": "address" }],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}
];

// Uniswap V2 Pair ABI (only getReserves, token0, token1 functions)
const PAIR_ABI = [
	{
		"constant": true,
		"inputs": [],
		"name": "getReserves",
		"outputs": [
			{ "internalType": "uint112", "name": "_reserve0", "type": "uint112" },
			{ "internalType": "uint112", "name": "_reserve1", "type": "uint112" },
			{ "internalType": "uint32", "name": "_blockTimestampLast", "type": "uint32" }
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "token0",
		"outputs": [{ "internalType": "address", "name": "", "type": "address" }],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "token1",
		"outputs": [{ "internalType": "address", "name": "", "type": "address" }],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}
];

@Injectable()
export class UniswapService {
	private readonly logger = new Logger(UniswapService.name);
	private readonly provider: ethers.providers.JsonRpcProvider;
	private readonly factoryAddress: string;
	private readonly factory: ethers.Contract;

	constructor(
		private configService: ConfigService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
	) {
		const rpcUrl = this.configService.get<string>('ETHEREUM_RPC_URL');
		this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
		this.factoryAddress = this.configService.get<string>('UNISWAP_V2_FACTORY') || '';
		this.factory = new ethers.Contract(this.factoryAddress, FACTORY_ABI, this.provider);
	}

	/**
	 * General equation with algebraic steps for the calculate amounts out:
	 * --------------------------------------------------------------------
	 * Step 1: Start with the equation
	 * reserveIn * reserveOut = (reserveIn + amountIn) * (reserveOut - amountOut)
	 *
	 * Step 2: Expand the right side
	 * reserveIn * reserveOut = reserveIn * reserveOut - reserveIn * amountOut + amountIn * reserveOut - amountIn * amountOut

	 * Step 3: Subtract (reserveIn * reserveOut) from both sides
	 * 0 = -reserveIn * amountOut + amountIn * reserveOut - amountIn * amountOut

	 * Step 4: Rearrange
	 * reserveIn * amountOut + amountIn * amountOut = amountIn * reserveOut

	 * Step 5: Factor out amountOut
	 * amountOut * (reserveIn + amountIn) = amountIn * reserveOut

	 * Step 6: Solve for amountOut
	 * amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
	 * --------------------------------------------------------------------
	 * amountInWithFee = amountIn * 997 / 1000
	 * 
	 * Forumla Sources
	 * ----------------
	 * amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee)
	 * ========================================================================================
	 * UniswapV2Library Contract: https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol
	 * Pair Contract: https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol
	 * UniswapV2 Documentation:
	 * - Whitepaper: https://uniswap.org/whitepaper.pdf
	 * - Docs: https://docs.uniswap.org/contracts/v2/concepts/core-concepts/swaps
	*/
	calculateAmountOut(reserveIn: BigNumber, reserveOut: BigNumber, amountIn: BigNumber): BigNumber {
		if (reserveIn.lte(0) || reserveOut.lte(0)) {
			throw new BadRequestException('Insufficient Liquidity');
		}

		if (amountIn.lte(0)) {
			throw new BadRequestException('Amount in must be greater than zero');
		}

		const amountInWithFee = amountIn.mul(997).div(1000);
		const amountOut = (amountInWithFee.mul(reserveOut)).div(reserveIn.mul(1000).add(amountInWithFee));
		return amountOut;
	}

	private async getCachedEstimatedAmountOut(fromTokenAddress: string, toTokenAddress: string, amountIn: string): Promise<number | null> {
		const cacheKey = `${fromTokenAddress}-${toTokenAddress}-${amountIn}`;
		const cachedValue = await this.cacheManager.get<number>(cacheKey);
		if (cachedValue) {
			return cachedValue;
		}
		return null;
	}

	private async setCachedEstimatedAmountOut(fromTokenAddress: string, toTokenAddress: string, amountIn: string, amountOut: number) {
		const cacheKey = `${fromTokenAddress}-${toTokenAddress}-${amountIn}`;
		await this.cacheManager.set(cacheKey, amountOut);
	}

	async getEstimatedAmountOut(fromTokenAddress: string, toTokenAddress: string, amountIn: string): Promise<EstimatedAmountOutResponseDto> {
		try {
			if (!ethers.utils.isAddress(fromTokenAddress)) {
				throw new BadRequestException('Invalid from token address');
			}
			if (!ethers.utils.isAddress(toTokenAddress)) {
				throw new BadRequestException('Invalid to token address');
			}
			if (amountIn === '0') {
				throw new BadRequestException('Amount in must be greater than zero');
			}

			const pairAddress = await this.factory.getPair(fromTokenAddress, toTokenAddress);
			if (!pairAddress || pairAddress === ethers.constants.AddressZero) {
				throw new BadRequestException('Pair not found in Uniswap V2 Factory Contract');
			}

			const cachedValue = await this.getCachedEstimatedAmountOut(fromTokenAddress, toTokenAddress, amountIn);
			if (cachedValue) {
				return { estimatedOutputAmount: cachedValue.toString() };
			}
			const pair = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
			const reserves = await pair.getReserves();
			const token0 = await pair.token0();

			// Determine which reserve corresponds to which token
			let reserveIn: BigNumber;
			let reserveOut: BigNumber;

			// Uniswap pairs always store tokens in sorted order (token0 < token1)
			// We need to determine which reserve corresponds to our input token
			if (token0.toLowerCase() === fromTokenAddress.toLowerCase()) {
				reserveIn = reserves._reserve0;
				reserveOut = reserves._reserve1;
			} else {
				reserveIn = reserves._reserve1;
				reserveOut = reserves._reserve0;
			}

			const amountInBigNumber = ethers.utils.parseUnits(amountIn.toString(), 18);
			const amountOut = this.calculateAmountOut(reserveIn, reserveOut, amountInBigNumber);

			const formattedAmount = Number(ethers.utils.formatUnits(amountOut, 18));
			this.setCachedEstimatedAmountOut(fromTokenAddress, toTokenAddress, amountIn, formattedAmount);

			return {
				estimatedOutputAmount: formattedAmount.toString()
			};
		} catch (error) {
			// Re-throw BadRequestException so it reaches the client with the proper error message
			if (error instanceof BadRequestException) {
				throw error;
			}
			// Log and throw generic error for unexpected errors
			this.logger.error('Error getting pair reserves:', error);
			throw new BadRequestException('Failed to get pair reserves');
		}
	}
}
