import { Test, TestingModule } from '@nestjs/testing';
import { UniswapService } from './uniswap.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';
import { ethers, BigNumber } from 'ethers';

describe('UniswapService', () => {
	let service: UniswapService;
	let configService: ConfigService;
	let cacheManager: any;
	let mockFactory: any;
	let mockPair: any;

	const mockFromTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
	const mockToTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
	const mockPairAddress = '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc';
	const mockAmountIn = '1000000000000000000'; // 1 ETH in wei

	beforeEach(async () => {
		// Mock cache manager
		cacheManager = {
			get: jest.fn(),
			set: jest.fn(),
		};

		// Mock config service
		configService = {
			get: jest.fn((key: string) => {
				if (key === 'ETHEREUM_RPC_URL') return 'https://eth-mainnet.example.com';
				if (key === 'UNISWAP_V2_FACTORY') return '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
				return null;
			}),
		} as any;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UniswapService,
				{
					provide: ConfigService,
					useValue: configService,
				},
				{
					provide: CACHE_MANAGER,
					useValue: cacheManager,
				},
			],
		}).compile();

		service = module.get<UniswapService>(UniswapService);

		// Mock the factory contract
		mockFactory = {
			getPair: jest.fn(),
		};

		// Mock the pair contract
		mockPair = {
			getReserves: jest.fn(),
			token0: jest.fn(),
		};

		// Replace the factory with our mock
		(service as any).factory = mockFactory;

		// Suppress logger output during tests
		jest.spyOn((service as any).logger, 'log').mockImplementation();
		jest.spyOn((service as any).logger, 'error').mockImplementation();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Service Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined();
		});

		it('should initialize with correct configuration', () => {
			expect(configService.get).toHaveBeenCalledWith('ETHEREUM_RPC_URL');
			expect(configService.get).toHaveBeenCalledWith('UNISWAP_V2_FACTORY');
		});
	});

	describe('calculateAmountOut', () => {
		it('should calculate correct amount out with valid inputs', () => {
			const reserveIn = BigNumber.from('1000000000000000000000'); // 1000 tokens
			const reserveOut = BigNumber.from('2000000000000000000000'); // 2000 tokens
			const amountIn = BigNumber.from('100000000000000000000'); // 100 tokens

			const result = service.calculateAmountOut(reserveIn, reserveOut, amountIn);

			// Expected calculation:
			// amountInWithFee = 100 * 997 / 1000 = 99.7
			// amountOut = (99.7 * 2000) / (1000 * 1000 + 99.7)
			expect(result).toBeDefined();
			expect(result.gt(0)).toBe(true);
		});

		it('should throw error when reserveIn is zero', () => {
			const reserveIn = BigNumber.from(0);
			const reserveOut = BigNumber.from('2000000000000000000000');
			const amountIn = BigNumber.from('100000000000000000000');

			expect(() => service.calculateAmountOut(reserveIn, reserveOut, amountIn))
				.toThrow(BadRequestException);
			expect(() => service.calculateAmountOut(reserveIn, reserveOut, amountIn))
				.toThrow('Insufficient Liquidity');
		});

		it('should throw error when reserveOut is zero', () => {
			const reserveIn = BigNumber.from('1000000000000000000000');
			const reserveOut = BigNumber.from(0);
			const amountIn = BigNumber.from('100000000000000000000');

			expect(() => service.calculateAmountOut(reserveIn, reserveOut, amountIn))
				.toThrow(BadRequestException);
			expect(() => service.calculateAmountOut(reserveIn, reserveOut, amountIn))
				.toThrow('Insufficient Liquidity');
		});

		it('should throw error when amountIn is zero', () => {
			const reserveIn = BigNumber.from('1000000000000000000000');
			const reserveOut = BigNumber.from('2000000000000000000000');
			const amountIn = BigNumber.from(0);

			expect(() => service.calculateAmountOut(reserveIn, reserveOut, amountIn))
				.toThrow(BadRequestException);
			expect(() => service.calculateAmountOut(reserveIn, reserveOut, amountIn))
				.toThrow('Amount in must be greater than zero');
		});

		it('should apply 0.3% fee correctly', () => {
			const reserveIn = BigNumber.from('1000000000000000000000');
			const reserveOut = BigNumber.from('1000000000000000000000');
			const amountIn = BigNumber.from('1000000000000000000');

			const result = service.calculateAmountOut(reserveIn, reserveOut, amountIn);

			// With 0.3% fee, output should be slightly less than input (in a 1:1 pool)
			expect(result.lt(amountIn)).toBe(true);
		});
	});

	describe('getEstimatedAmountOut', () => {
		it('should throw error for invalid fromTokenAddress', async () => {
			await expect(
				service.getEstimatedAmountOut('invalid-address', mockToTokenAddress, mockAmountIn)
			).rejects.toThrow(BadRequestException);
			await expect(
				service.getEstimatedAmountOut('invalid-address', mockToTokenAddress, mockAmountIn)
			).rejects.toThrow('Invalid from token address');
		});

		it('should throw error for invalid toTokenAddress', async () => {
			await expect(
				service.getEstimatedAmountOut(mockFromTokenAddress, 'invalid-address', mockAmountIn)
			).rejects.toThrow(BadRequestException);
			await expect(
				service.getEstimatedAmountOut(mockFromTokenAddress, 'invalid-address', mockAmountIn)
			).rejects.toThrow('Invalid to token address');
		});

		it('should throw error when pair is not found', async () => {
			mockFactory.getPair.mockResolvedValue(ethers.constants.AddressZero);

			await expect(
				service.getEstimatedAmountOut(mockFromTokenAddress, mockToTokenAddress, mockAmountIn)
			).rejects.toThrow(BadRequestException);
			await expect(
				service.getEstimatedAmountOut(mockFromTokenAddress, mockToTokenAddress, mockAmountIn)
			).rejects.toThrow('Pair not found in Uniswap V2 Factory Contract');
		});

		it('should return cached value if available', async () => {
			const cachedValue = 1234.5678;
			cacheManager.get.mockResolvedValue(cachedValue);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);

			const result = await service.getEstimatedAmountOut(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);

			expect(result).toEqual({
				estimatedOutputAmount: cachedValue.toString(),
			});
			expect(cacheManager.get).toHaveBeenCalledWith(
				`${mockFromTokenAddress}-${mockToTokenAddress}-${mockAmountIn}`
			);
		});

		it('should fetch from blockchain when cache is empty', async () => {
			cacheManager.get.mockResolvedValue(null);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);

			const mockReserves = {
				_reserve0: BigNumber.from('1000000000000000000000'),
				_reserve1: BigNumber.from('2000000000000000000000'),
			};

			mockPair.getReserves.mockResolvedValue(mockReserves);
			mockPair.token0.mockResolvedValue(mockFromTokenAddress);

			// Mock ethers.Contract constructor
			jest.spyOn(ethers, 'Contract').mockImplementation(() => mockPair as any);

			const result = await service.getEstimatedAmountOut(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);

			expect(result).toHaveProperty('estimatedOutputAmount');
			expect(typeof result.estimatedOutputAmount).toBe('string');
			expect(mockFactory.getPair).toHaveBeenCalledWith(mockFromTokenAddress, mockToTokenAddress);
			expect(mockPair.getReserves).toHaveBeenCalled();
			expect(mockPair.token0).toHaveBeenCalled();
		});

		it('should use correct reserves when fromToken is token0', async () => {
			cacheManager.get.mockResolvedValue(null);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);

			const mockReserves = {
				_reserve0: BigNumber.from('1000000000000000000000'),
				_reserve1: BigNumber.from('2000000000000000000000'),
			};

			mockPair.getReserves.mockResolvedValue(mockReserves);
			mockPair.token0.mockResolvedValue(mockFromTokenAddress.toLowerCase());

			jest.spyOn(ethers, 'Contract').mockImplementation(() => mockPair as any);

			const result = await service.getEstimatedAmountOut(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);

			expect(result).toHaveProperty('estimatedOutputAmount');
			expect(cacheManager.set).toHaveBeenCalled();
		});

		it('should use correct reserves when fromToken is token1', async () => {
			cacheManager.get.mockResolvedValue(null);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);

			const mockReserves = {
				_reserve0: BigNumber.from('1000000000000000000000'),
				_reserve1: BigNumber.from('2000000000000000000000'),
			};

			mockPair.getReserves.mockResolvedValue(mockReserves);
			mockPair.token0.mockResolvedValue(mockToTokenAddress.toLowerCase()); // Different token

			jest.spyOn(ethers, 'Contract').mockImplementation(() => mockPair as any);

			const result = await service.getEstimatedAmountOut(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);

			expect(result).toHaveProperty('estimatedOutputAmount');
		});

		it('should cache the result after fetching from blockchain', async () => {
			cacheManager.get.mockResolvedValue(null);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);

			const mockReserves = {
				_reserve0: BigNumber.from('1000000000000000000000'),
				_reserve1: BigNumber.from('2000000000000000000000'),
			};

			mockPair.getReserves.mockResolvedValue(mockReserves);
			mockPair.token0.mockResolvedValue(mockFromTokenAddress);

			jest.spyOn(ethers, 'Contract').mockImplementation(() => mockPair as any);

			await service.getEstimatedAmountOut(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);

			expect(cacheManager.set).toHaveBeenCalled();
			const setCacheCall = cacheManager.set.mock.calls[0];
			expect(setCacheCall[0]).toBe(`${mockFromTokenAddress}-${mockToTokenAddress}-${mockAmountIn}`);
			expect(typeof setCacheCall[1]).toBe('number');
		});

		it('should handle errors when fetching reserves fails', async () => {
			cacheManager.get.mockResolvedValue(null);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);
			mockPair.getReserves.mockRejectedValue(new Error('Network error'));

			jest.spyOn(ethers, 'Contract').mockImplementation(() => mockPair as any);

			await expect(
				service.getEstimatedAmountOut(mockFromTokenAddress, mockToTokenAddress, mockAmountIn)
			).rejects.toThrow(BadRequestException);
			await expect(
				service.getEstimatedAmountOut(mockFromTokenAddress, mockToTokenAddress, mockAmountIn)
			).rejects.toThrow('Failed to get pair reserves');
		});
	});

	describe('Cache Management', () => {
		it('should generate correct cache key', async () => {
			const cachedValue = 100;
			cacheManager.get.mockResolvedValue(cachedValue);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);

			await service.getEstimatedAmountOut(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);

			expect(cacheManager.get).toHaveBeenCalledWith(
				`${mockFromTokenAddress}-${mockToTokenAddress}-${mockAmountIn}`
			);
		});

		it('should store numeric values in cache', async () => {
			cacheManager.get.mockResolvedValue(null);
			mockFactory.getPair.mockResolvedValue(mockPairAddress);

			const mockReserves = {
				_reserve0: BigNumber.from('1000000000000000000000'),
				_reserve1: BigNumber.from('2000000000000000000000'),
			};

			mockPair.getReserves.mockResolvedValue(mockReserves);
			mockPair.token0.mockResolvedValue(mockFromTokenAddress);

			jest.spyOn(ethers, 'Contract').mockImplementation(() => mockPair as any);

			await service.getEstimatedAmountOut(
				mockFromTokenAddress,
				mockToTokenAddress,
				mockAmountIn
			);

			expect(cacheManager.set).toHaveBeenCalled();
			const cachedValue = cacheManager.set.mock.calls[0][1];
			expect(typeof cachedValue).toBe('number');
		});
	});
});
