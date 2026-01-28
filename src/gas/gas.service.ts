import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ethers } from 'ethers';


@Injectable()
export class GasService implements OnModuleInit {
    private readonly logger = new Logger(GasService.name);
    private readonly provider: ethers.providers.JsonRpcProvider;
    private refreshInterval: NodeJS.Timeout;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private configService: ConfigService
    ) {
        const rpcUrl = this.configService.get<string>('ETHEREUM_RPC_URL');
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    }

    async onModuleInit() {
        // Fetch initial gas price
        await this.fetchAndCacheGasPrice();

        // Set up background refresh every 30 seconds
        this.refreshInterval = setInterval(async () => {
            await this.fetchAndCacheGasPrice();
        }, this.configService.get<number>('GAS_PRICE_FETCH_INTERVAL') || 30 * 1000);
    }

    private async fetchAndCacheGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            const currentGasPrice = Number(feeData.gasPrice);
            await this.cacheManager.set('gasPrice', currentGasPrice);
            this.logger.log(`Gas price updated in cache: ${currentGasPrice}`);
        } catch (error) {
            this.logger.error('Failed to fetch gas price:', error);
        }
    }

    async getGasPrice() {
        this.logger.log('Getting gas price...');
        const gasPrice = await this.cacheManager.get<number>('gasPrice');

        // Check for null/undefined, not falsy (0 is a valid gas price)
        if (gasPrice !== null && gasPrice !== undefined) {
            this.logger.log('Gas price found in cache: ' + gasPrice);
            return gasPrice;
        }

        // Fallback: fetch immediately if cache is empty (shouldn't happen with background refresh)
        this.logger.warn(`Cache miss - fetching gas price immediately ${gasPrice}`);
        await this.fetchAndCacheGasPrice();
        return await this.cacheManager.get<number>('gasPrice');
    }
}
