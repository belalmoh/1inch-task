import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { GasModule } from './gas/gas.module';
import { UniswapModule } from './uniswap/uniswap.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		CacheModule.register({
			ttl: Number(process.env.CACHE_TTL) || 60 * 1000, // 60 seconds as a default value
		}),
		GasModule,
		UniswapModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule { }
