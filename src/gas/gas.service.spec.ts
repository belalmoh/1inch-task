import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GasService } from './gas.service';

describe('GasService', () => {
	let service: GasService;
	let configService: ConfigService;
	let cacheManager: any;
	let mockGetFeeData: jest.Mock;

	const mockCacheManager = {
		get: jest.fn(),
		set: jest.fn(),
		del: jest.fn(),
	};

	const mockConfigService = {
		get: jest.fn((key: string) => {
			const config: Record<string, any> = {
				ETHEREUM_RPC_URL: 'https://eth-mainnet.example.com',
				GAS_PRICE_FETCH_INTERVAL: 30000,
			};
			return config[key];
		}),
	};

	beforeEach(async () => {
		jest.clearAllMocks();
		jest.clearAllTimers();
		jest.useFakeTimers();

		// Create mock for getFeeData
		mockGetFeeData = jest.fn();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GasService,
				{
					provide: ConfigService,
					useValue: mockConfigService,
				},
				{
					provide: CACHE_MANAGER,
					useValue: mockCacheManager,
				},
			],
		}).compile();

		service = module.get<GasService>(GasService);
		configService = module.get<ConfigService>(ConfigService);
		cacheManager = module.get(CACHE_MANAGER);

		// Replace the provider's getFeeData with our mock
		(service as any).provider.getFeeData = mockGetFeeData;
	});

	afterEach(() => {
		jest.useRealTimers();
		if ((service as any).refreshInterval) {
			clearInterval((service as any).refreshInterval);
		}
	});

	describe('Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined();
		});

		it('should initialize with correct RPC URL from config', () => {
			expect(configService.get).toHaveBeenCalledWith('ETHEREUM_RPC_URL');
		});

		it('should have a provider instance', () => {
			expect((service as any).provider).toBeDefined();
		});
	});

	describe('onModuleInit()', () => {
		it('should fetch initial gas price on module init', async () => {
			const mockFeeData = { gasPrice: { toString: () => '250000000' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			await service.onModuleInit();

			expect(mockGetFeeData).toHaveBeenCalledTimes(1);
			expect(cacheManager.set).toHaveBeenCalledWith('gasPrice', 250000000);
		});

		it('should set up background refresh interval', async () => {
			const mockFeeData = { gasPrice: { toString: () => '250000000' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			await service.onModuleInit();

			expect((service as any).refreshInterval).toBeDefined();
		});
	});

	describe('getGasPrice()', () => {
		it('should return cached gas price when available', async () => {
			const cachedPrice = 250000000;
			mockCacheManager.get.mockResolvedValue(cachedPrice);

			const result = await service.getGasPrice();

			expect(result).toBe(cachedPrice);
			expect(cacheManager.get).toHaveBeenCalledWith('gasPrice');
			expect(mockGetFeeData).not.toHaveBeenCalled();
		});

		it('should handle zero gas price correctly', async () => {
			mockCacheManager.get.mockResolvedValue(0);

			const result = await service.getGasPrice();

			expect(result).toBe(0);
			expect(mockGetFeeData).not.toHaveBeenCalled();
		});

		it('should fetch from provider when cache is empty (null)', async () => {
			const mockFeeData = { gasPrice: { toString: () => '350000000' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			// First call returns null, second call returns the cached value
			mockCacheManager.get
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(350000000);

			const result = await service.getGasPrice();

			expect(result).toBe(350000000);
			expect(mockGetFeeData).toHaveBeenCalled();
			expect(cacheManager.set).toHaveBeenCalledWith('gasPrice', 350000000);
		});

		it('should fetch from provider when cache is empty (undefined)', async () => {
			const mockFeeData = { gasPrice: { toString: () => '400000000' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			mockCacheManager.get
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(400000000);

			const result = await service.getGasPrice();

			expect(result).toBe(400000000);
			expect(mockGetFeeData).toHaveBeenCalled();
		});

		it('should handle very large gas price values', async () => {
			const largeGasPrice = Number.MAX_SAFE_INTEGER;
			mockCacheManager.get.mockResolvedValue(largeGasPrice);

			const result = await service.getGasPrice();

			expect(result).toBe(largeGasPrice);
		});
	});

	describe('fetchAndCacheGasPrice()', () => {
		it('should fetch gas price from provider and cache it', async () => {
			const mockFeeData = { gasPrice: { toString: () => '300000000' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			await (service as any).fetchAndCacheGasPrice();

			expect(mockGetFeeData).toHaveBeenCalled();
			expect(cacheManager.set).toHaveBeenCalledWith('gasPrice', 300000000);
		});

		it('should handle provider errors gracefully', async () => {
			const error = new Error('Provider connection failed');
			mockGetFeeData.mockRejectedValue(error);

			// Should not throw
			await expect((service as any).fetchAndCacheGasPrice()).resolves.not.toThrow();
		});

		it('should convert gas price to number', async () => {
			const mockFeeData = { gasPrice: { toString: () => '123456789' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			await (service as any).fetchAndCacheGasPrice();

			expect(cacheManager.set).toHaveBeenCalledWith('gasPrice', 123456789);
		});
	});

	describe('Background Refresh', () => {
		it('should refresh gas price periodically', async () => {
			const mockFeeData = { gasPrice: { toString: () => '250000000' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			await service.onModuleInit();

			// Initial call
			expect(mockGetFeeData).toHaveBeenCalledTimes(1);

			// Fast-forward 30 seconds
			jest.advanceTimersByTime(30000);
			await Promise.resolve();

			// Should have been called again
			expect(mockGetFeeData).toHaveBeenCalledTimes(2);
		});

		it('should continue refreshing even if one fetch fails', async () => {
			mockGetFeeData
				.mockResolvedValueOnce({ gasPrice: { toString: () => '250000000' } })
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce({ gasPrice: { toString: () => '260000000' } });

			mockCacheManager.set.mockResolvedValue(undefined);

			await service.onModuleInit();

			// Fast-forward through two intervals
			jest.advanceTimersByTime(30000);
			await Promise.resolve();
			jest.advanceTimersByTime(30000);
			await Promise.resolve();

			// Should have attempted 3 times (initial + 2 intervals)
			expect(mockGetFeeData).toHaveBeenCalledTimes(3);
		});
	});

	describe('Cache Integration', () => {
		it('should properly interact with cache manager', async () => {
			const mockGasPrice = 275000000;
			mockCacheManager.get.mockResolvedValue(mockGasPrice);

			await service.getGasPrice();

			expect(cacheManager.get).toHaveBeenCalledWith('gasPrice');
		});

		it('should set cache with correct key and value', async () => {
			const mockFeeData = { gasPrice: { toString: () => '280000000' } };
			mockGetFeeData.mockResolvedValue(mockFeeData);
			mockCacheManager.set.mockResolvedValue(undefined);

			await (service as any).fetchAndCacheGasPrice();

			expect(cacheManager.set).toHaveBeenCalledWith('gasPrice', 280000000);
		});
	});

	describe('Error Handling', () => {
		it('should handle cache get errors', async () => {
			mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

			await expect(service.getGasPrice()).rejects.toThrow('Cache error');
		});

		it('should log errors when fetching fails', async () => {
			const loggerSpy = jest.spyOn((service as any).logger, 'error');
			const error = new Error('RPC error');
			mockGetFeeData.mockRejectedValue(error);

			await (service as any).fetchAndCacheGasPrice();

			expect(loggerSpy).toHaveBeenCalledWith('Failed to fetch gas price:', error);
		});
	});
});
