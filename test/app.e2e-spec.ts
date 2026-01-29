import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
	let app: INestApplication<App>;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	it('/ (GET)', () => {
		return request(app.getHttpServer())
			.get('/')
			.expect(200)
			.expect('Hello World!');
	});

	it('/gasPrice (GET)', () => {
		return request(app.getHttpServer())
			.get('/gasPrice')
			.expect(200)
			.expect((res: any) => {
				expect(res.body).toHaveProperty('gasPrice');
				expect(res.body.gasPrice).toBeGreaterThan(0);
			});
	});

	it('/return/:fromTokenAddress/:toTokenAddress/:amountIn (GET)', () => {
		return request(app.getHttpServer())
			.get('/return/0x1f9840a85d5af5bf1d1764f4f5dc98555f0e61f9/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/1000000000000000000')
			.expect(200)
			.expect((res: any) => {
				expect(res.body).toHaveProperty('estimatedOutputAmount');
				expect(res.body.estimatedOutputAmount).toBeGreaterThan(0);
			});
	});
});
