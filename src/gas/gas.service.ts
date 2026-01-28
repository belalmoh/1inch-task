import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ethers } from 'ethers';


@Injectable()
export class GasService {
    private readonly logger = new Logger(GasService.name);
    private readonly provider: ethers.JsonRpcProvider;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private configService: ConfigService
    ) {
        const rpcUrl = this.configService.get<string>('ETHEREUM_RPC_URL');
        this.provider = new ethers.JsonRpcProvider(rpcUrl);

        // Initialize cache asynchronously if needed
        this.initializeCache();
    }

    private async initializeCache() {
        await this.cacheManager.set('gasPrice', 0);
    }

    async getGasPrice() {
        const gasPrice = await this.cacheManager.get<number>('gasPrice');
        if (gasPrice) {
            return gasPrice;
        }

        // Fetch fresh gas price from provider if not in cache
        const feeData = await this.provider.getFeeData();
        const currentGasPrice = Number(feeData.gasPrice);

        // Store in cache
        await this.cacheManager.set('gasPrice', currentGasPrice);

        return currentGasPrice;
    }
}
