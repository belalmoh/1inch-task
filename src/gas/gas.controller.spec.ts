import { Test, TestingModule } from '@nestjs/testing';
import { GasController } from './gas.controller';
import { GasService } from './gas.service';

describe('GasController', () => {
	let controller: GasController;
	let gasService: GasService;

	// Mock GasService
	const mockGasService = {
		getGasPrice: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [GasController],
			providers: [
				{
					provide: GasService,
					useValue: mockGasService,
				},
			],
		}).compile();

		controller = module.get<GasController>(GasController);
		gasService = module.get<GasService>(GasService);

		// Clear all mocks before each test
		jest.clearAllMocks();
	});

	describe('Basic Functionality', () => {
		it('should be defined', () => {
			expect(controller).toBeDefined();
		});

		it('should have getGasPrice method', () => {
			expect(controller.getGasPrice).toBeDefined();
			expect(typeof controller.getGasPrice).toBe('function');
		});
	});

	describe('getGasPrice()', () => {
		it('should return gas price from service', async () => {
			const mockGasPrice = 123456789;
			mockGasService.getGasPrice.mockResolvedValue(mockGasPrice);

			const result = await controller.getGasPrice();

			expect(result).toBe(mockGasPrice);
			expect(gasService.getGasPrice).toHaveBeenCalledTimes(1);
		});

		it('should handle different gas price values', async () => {
			const testCases = [0, 100, 999999999, 1234567890];

			for (const gasPrice of testCases) {
				mockGasService.getGasPrice.mockResolvedValue(gasPrice);
				const result = await controller.getGasPrice();
				expect(result).toBe(gasPrice);
			}
		});

		it('should propagate errors from service', async () => {
			const error = new Error('Failed to fetch gas price');
			mockGasService.getGasPrice.mockRejectedValue(error);

			await expect(controller.getGasPrice()).rejects.toThrow('Failed to fetch gas price');
		});
	});

	describe('Performance Requirements', () => {
		it('should respond in less than 50ms (cached response)', async () => {
			const mockGasPrice = 250000000;
			mockGasService.getGasPrice.mockResolvedValue(mockGasPrice);

			const startTime = performance.now();
			await controller.getGasPrice();
			const endTime = performance.now();
			const responseTime = endTime - startTime;

			expect(responseTime).toBeLessThan(50);
		});

		it('should consistently respond in less than 50ms over multiple calls', async () => {
			const mockGasPrice = 250000000;
			mockGasService.getGasPrice.mockResolvedValue(mockGasPrice);

			const responseTimes: number[] = [];
			const iterations = 10;

			for (let i = 0; i < iterations; i++) {
				const startTime = performance.now();
				await controller.getGasPrice();
				const endTime = performance.now();
				responseTimes.push(endTime - startTime);
			}

			// All response times should be under 50ms
			responseTimes.forEach((time, index) => {
				expect(time).toBeLessThan(50);
			});

			// Average response time should be well under 50ms
			const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
			expect(avgResponseTime).toBeLessThan(50);
		});

		it('should have acceptable performance under concurrent requests', async () => {
			const mockGasPrice = 250000000;
			mockGasService.getGasPrice.mockResolvedValue(mockGasPrice);

			const concurrentRequests = 20;
			const startTime = performance.now();

			const promises = Array(concurrentRequests)
				.fill(null)
				.map(() => controller.getGasPrice());

			await Promise.all(promises);
			const endTime = performance.now();
			const totalTime = endTime - startTime;

			// Even with concurrent requests, average time per request should be reasonable
			const avgTimePerRequest = totalTime / concurrentRequests;
			expect(avgTimePerRequest).toBeLessThan(100); // More lenient for concurrent
		});
	});

	describe('Edge Cases', () => {
		it('should handle zero gas price', async () => {
			mockGasService.getGasPrice.mockResolvedValue(0);
			const result = await controller.getGasPrice();
			expect(result).toBe(0);
		});

		it('should handle very large gas price values', async () => {
			const largeGasPrice = Number.MAX_SAFE_INTEGER;
			mockGasService.getGasPrice.mockResolvedValue(largeGasPrice);
			const result = await controller.getGasPrice();
			expect(result).toBe(largeGasPrice);
		});

		it('should handle service returning undefined gracefully', async () => {
			mockGasService.getGasPrice.mockResolvedValue(undefined);
			const result = await controller.getGasPrice();
			expect(result).toBeUndefined();
		});
	});
});
