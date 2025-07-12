import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ParsedMetrics } from './common/metrics.service';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get('/health')
	getHello(): string {
		return this.appService.getHello();
	}

	@Get('/metrics')
	async getMetrics(): Promise<ParsedMetrics> {
		return this.appService.getMetrics();
	}
}
