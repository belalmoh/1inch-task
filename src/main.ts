import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const config = new DocumentBuilder()
		.setTitle('1inch Task API')
		.setDescription('1inch Task API description')
		.setVersion('1.0')
		.addTag('1inch')
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	const port = process.env.PORT ?? 3000;
	await app.listen(port);
	console.log(`Application is running on port: ${port}`);
	console.log(`Swagger is running on: http://localhost:${port}/api`);
}
bootstrap();
