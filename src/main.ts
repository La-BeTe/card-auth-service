import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { metricsService } from './common/metrics.service';
import { AllExceptionsFilter } from './common/exceptions.filter';
import { ResponseInterceptor } from './common/response.interceptor';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	app.useGlobalFilters(new AllExceptionsFilter());

	app.useGlobalInterceptors(new ResponseInterceptor());

	// Global middleware for metrics tracking
	metricsService.setupApp(app);

	await app.listen(process.env.PORT || 3000);
}
bootstrap();
