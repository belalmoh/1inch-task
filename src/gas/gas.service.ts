import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ethers } from 'ethers';
import { GasPriceResponseDto } from '@common/dto/gas.dto';


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

        // Set up background refresh every 30 seconds if the value not existing in the .env
        this.refreshInterval = setInterval(async () => {
            await this.fetchAndCacheGasPrice();
        }, this.configService.get<number>('GAS_PRICE_FETCH_INTERVAL') || 30 * 1000);
    }

    private async fetchAndCacheGasPrice() {
        try {
            // get fee data from the provider
            const feeData = await this.provider.getFeeData();
            // convert gas price to number
            const currentGasPrice = Number(feeData.gasPrice);
            // set gas price in cache
            await this.cacheManager.set('gasPrice', currentGasPrice);
            this.logger.log(`Gas price updated in cache: ${currentGasPrice}`);
            return currentGasPrice;
        } catch (error) {
            this.logger.error('Failed to fetch gas price:', error);
        }
    }

    async getGasPrice(): Promise<GasPriceResponseDto> {
        this.logger.log('Getting gas price...');
        // get gas price from cache
        const gasPrice = await this.cacheManager.get<number>('gasPrice');

        // Check for null/undefined, not falsy (0 is a valid gas price)
        if (gasPrice !== null && gasPrice !== undefined) {
            this.logger.log('Gas price found in cache: ' + gasPrice);
            return { gasPrice };
        }

        // Fallback: fetch immediately if cache is empty (shouldn't happen with background refresh)
        this.logger.warn(`Cache miss - fetching gas price immediately ${gasPrice}`);
        const fetchedGasPrice = await this.fetchAndCacheGasPrice();

        return { gasPrice: fetchedGasPrice ?? 0 };
    }
}
