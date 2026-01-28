import { Test, TestingModule } from '@nestjs/testing';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';
import { EstimatedAmountOutRequestDto, EstimatedAmountOutResponseDto } from '@common/dto/uniswap.dto';
import { BadRequestException } from '@nestjs/common';

describe('UniswapController', () => {
	let controller: UniswapController;
	let service: UniswapService;

	const mockUniswapService = {
		getEstimatedAmountOut: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [UniswapController],
			providers: [
				{
					provide: UniswapService,
					useValue: mockUniswapService,
				},
			],
		}).compile();

		controller = module.get<UniswapController>(UniswapController);
		service = module.get<UniswapService>(UniswapService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Controller Initialization', () => {
		it('should be defined', () => {
			expect(controller).toBeDefined();
		});

		it('should have uniswapService injected', () => {
			expect(service).toBeDefined();
		});
	});

	describe('getEstimatedAmountOut', () => {
		const mockFromTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
		const mockToTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
		const mockAmountIn = '1000000000000000000'; // 1 ETH

		it('should call service with correct parameters', async () => {
			const mockResponse: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '1234.567890',
			};

			mockUniswapService.getEstimatedAmountOut.mockResolvedValue(mockResponse);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: mockAmountIn,
			};

			const result = await controller.getEstimatedAmountOut(params);

			expect(service.getEstimatedAmountOut).toHaveBeenCalledWith(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);
			expect(service.getEstimatedAmountOut).toHaveBeenCalledTimes(1);
			expect(result).toEqual(mockResponse);
		});

		it('should return EstimatedAmountOutResponseDto', async () => {
			const mockResponse: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '2500.123456',
			};

			mockUniswapService.getEstimatedAmountOut.mockResolvedValue(mockResponse);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: mockAmountIn,
			};

			const result = await controller.getEstimatedAmountOut(params);

			expect(result).toHaveProperty('estimatedOutputAmount');
			expect(typeof result.estimatedOutputAmount).toBe('string');
			expect(result.estimatedOutputAmount).toBe('2500.123456');
		});

		it('should handle different token pairs', async () => {
			const differentFromToken = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI
			const differentToToken = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT

			const mockResponse: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '999.999999',
			};

			mockUniswapService.getEstimatedAmountOut.mockResolvedValue(mockResponse);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: differentFromToken,
				toTokenAddress: differentToToken,
				amountIn: '5000000000000000000',
			};

			const result = await controller.getEstimatedAmountOut(params);

			expect(service.getEstimatedAmountOut).toHaveBeenCalledWith(
				differentFromToken,
				differentToToken,
				'5000000000000000000'
			);
			expect(result).toEqual(mockResponse);
		});

		it('should handle different amount inputs', async () => {
			const smallAmount = '1000000000000000'; // 0.001 ETH
			const largeAmount = '100000000000000000000'; // 100 ETH

			const mockResponse1: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '1.234567',
			};
			const mockResponse2: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '123456.789012',
			};

			// Test small amount
			mockUniswapService.getEstimatedAmountOut.mockResolvedValueOnce(mockResponse1);
			const params1: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: smallAmount,
			};
			const result1 = await controller.getEstimatedAmountOut(params1);
			expect(result1).toEqual(mockResponse1);

			// Test large amount
			mockUniswapService.getEstimatedAmountOut.mockResolvedValueOnce(mockResponse2);
			const params2: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: largeAmount,
			};
			const result2 = await controller.getEstimatedAmountOut(params2);
			expect(result2).toEqual(mockResponse2);
		});

		it('should propagate BadRequestException for invalid fromTokenAddress', async () => {
			mockUniswapService.getEstimatedAmountOut.mockRejectedValue(
				new BadRequestException('Invalid from token address')
			);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: 'invalid-address',
				toTokenAddress: mockToTokenAddress,
				amountIn: mockAmountIn,
			};

			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				BadRequestException
			);
			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				'Invalid from token address'
			);
		});

		it('should propagate BadRequestException for invalid toTokenAddress', async () => {
			mockUniswapService.getEstimatedAmountOut.mockRejectedValue(
				new BadRequestException('Invalid to token address')
			);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: 'invalid-address',
				amountIn: mockAmountIn,
			};

			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				BadRequestException
			);
			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				'Invalid to token address'
			);
		});

		it('should propagate BadRequestException when pair not found', async () => {
			mockUniswapService.getEstimatedAmountOut.mockRejectedValue(
				new BadRequestException('Pair not found in Uniswap V2 Factory Contract')
			);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: mockAmountIn,
			};

			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				BadRequestException
			);
			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				'Pair not found in Uniswap V2 Factory Contract'
			);
		});

		it('should propagate BadRequestException when fetching reserves fails', async () => {
			mockUniswapService.getEstimatedAmountOut.mockRejectedValue(
				new BadRequestException('Failed to get pair reserves')
			);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: mockAmountIn,
			};

			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				BadRequestException
			);
			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				'Failed to get pair reserves'
			);
		});

		it('should handle service errors gracefully', async () => {
			mockUniswapService.getEstimatedAmountOut.mockRejectedValue(
				new Error('Unexpected error')
			);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: mockAmountIn,
			};

			await expect(controller.getEstimatedAmountOut(params)).rejects.toThrow(
				'Unexpected error'
			);
		});

		it('should return numeric string in response', async () => {
			const mockResponse: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '0.000011085363711895',
			};

			mockUniswapService.getEstimatedAmountOut.mockResolvedValue(mockResponse);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: mockFromTokenAddress,
				toTokenAddress: mockToTokenAddress,
				amountIn: mockAmountIn,
			};

			const result = await controller.getEstimatedAmountOut(params);

			expect(result.estimatedOutputAmount).toMatch(/^\d+\.?\d*$/);
			expect(parseFloat(result.estimatedOutputAmount)).toBeGreaterThan(0);
		});

		it('should work with case-insensitive addresses', async () => {
			const upperCaseFrom = mockFromTokenAddress.toUpperCase();
			const lowerCaseTo = mockToTokenAddress.toLowerCase();

			const mockResponse: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '1500.00',
			};

			mockUniswapService.getEstimatedAmountOut.mockResolvedValue(mockResponse);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: upperCaseFrom,
				toTokenAddress: lowerCaseTo,
				amountIn: mockAmountIn,
			};

			const result = await controller.getEstimatedAmountOut(params);

			expect(service.getEstimatedAmountOut).toHaveBeenCalledWith(
				upperCaseFrom,
				lowerCaseTo,
				mockAmountIn
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe('Route Parameters', () => {
		it('should extract parameters from URL path', async () => {
			const mockResponse: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '100.50',
			};

			mockUniswapService.getEstimatedAmountOut.mockResolvedValue(mockResponse);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
				toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
				amountIn: '1000000000000000000',
			};

			await controller.getEstimatedAmountOut(params);

			expect(service.getEstimatedAmountOut).toHaveBeenCalledWith(
				params.fromTokenAddress,
				params.toTokenAddress,
				params.amountIn
			);
		});

		it('should pass all three parameters to service', async () => {
			const mockResponse: EstimatedAmountOutResponseDto = {
				estimatedOutputAmount: '200.75',
			};

			mockUniswapService.getEstimatedAmountOut.mockResolvedValue(mockResponse);

			const params: EstimatedAmountOutRequestDto = {
				fromTokenAddress: '0x1234567890123456789012345678901234567890',
				toTokenAddress: '0x0987654321098765432109876543210987654321',
				amountIn: '5000000000000000000',
			};

			await controller.getEstimatedAmountOut(params);

			const callArgs = mockUniswapService.getEstimatedAmountOut.mock.calls[0];
			expect(callArgs).toHaveLength(3);
			expect(callArgs[0]).toBe(params.fromTokenAddress);
			expect(callArgs[1]).toBe(params.toTokenAddress);
			expect(callArgs[2]).toBe(params.amountIn);
		});
	});
});
