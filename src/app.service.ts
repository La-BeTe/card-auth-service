import { Injectable } from '@nestjs/common';
import { metricsService, ParsedMetrics } from './common/metrics.service';

@Injectable()
export class AppService {
	constructor() {}

	getHello(): string {
		return 'Hello World!';
	}

	async getMetrics(): Promise<ParsedMetrics> {
		return metricsService.getMetrics();
	}
}
