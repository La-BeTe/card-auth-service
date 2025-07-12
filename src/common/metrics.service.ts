export interface ParsedMetrics {
	requests: {
		total: number;
		failed: number;
		successful: number;
	};
	performance: {
		avgDurationMs: number;
		p95DurationMs: number;
		p99DurationMs: number;
		avgCpuUsagePercent: number;
		avgMemoryUsageMb: number;
	};
	system: {
		cpuUsagePercent: number;
		memoryUsageMb: number;
		heapUsagePercent: number;
	};
}

class MetricsService {
	private requestStats = {
		total: 0,
		failed: 0,
		successful: 0,
		durations: [] as number[],
		cpuUsage: [] as number[],
		memoryUsage: [] as number[],
	};

	setupApp(app) {
		const thisObj = this;
		app.use(async (req, res, next) => {
			const startTime = Date.now();
			const originalEnd = res.end;

			// Override end function to capture response
			res.end = function (chunk?: any, encoding?: any) {
				if (req.url === '/metrics')
					return originalEnd.call(this, chunk, encoding);

				const duration = Date.now() - startTime;

				// Determine request status based on endpoint and response
				const responseBody = chunk ? JSON.parse(chunk.toString()) : {};
				let requestStatus: 'successful' | 'failed' =
					responseBody?.success ? 'successful' : 'failed';

				thisObj.recordRequest(requestStatus, duration);
				originalEnd.call(this, chunk, encoding);
			};

			next();
		});
	}

	private recordRequest(status: 'successful' | 'failed', durationMs: number) {
		this.requestStats.total++;
		if (status === 'successful') this.requestStats.successful++;
		else if (status === 'failed') this.requestStats.failed++;

		this.requestStats.durations.push(durationMs);
		if (this.requestStats.durations.length > 1000) {
			this.requestStats.durations.shift();
		}

		// Record system metrics
		const cpuUsage = this.getCpuUsage();
		const memoryUsage = this.getMemoryUsage();

		this.requestStats.cpuUsage.push(cpuUsage);
		this.requestStats.memoryUsage.push(memoryUsage);

		if (this.requestStats.cpuUsage.length > 1000) {
			this.requestStats.cpuUsage.shift();
		}
		if (this.requestStats.memoryUsage.length > 1000) {
			this.requestStats.memoryUsage.shift();
		}
	}

	async getMetrics(): Promise<ParsedMetrics> {
		const durations = this.requestStats.durations;
		const cpuUsage = this.requestStats.cpuUsage;
		const memoryUsage = this.requestStats.memoryUsage;

		return {
			requests: {
				total: this.requestStats.total,
				failed: this.requestStats.failed,
				successful: this.requestStats.successful,
			},
			performance: {
				avgDurationMs:
					durations.length > 0
						? parseFloat(
								(
									durations.reduce((a, b) => a + b, 0) /
									durations.length
								).toFixed(2),
							)
						: 0,
				p95DurationMs: parseFloat(
					this.calculatePercentile(durations, 95).toFixed(2),
				),
				p99DurationMs: parseFloat(
					this.calculatePercentile(durations, 99).toFixed(2),
				),
				avgCpuUsagePercent:
					cpuUsage.length > 0
						? parseFloat(
								(
									cpuUsage.reduce((a, b) => a + b, 0) /
									cpuUsage.length
								).toFixed(2),
							)
						: 0,
				avgMemoryUsageMb:
					memoryUsage.length > 0
						? parseFloat(
								(
									memoryUsage.reduce((a, b) => a + b, 0) /
									memoryUsage.length
								).toFixed(2),
							)
						: 0,
			},
			system: {
				cpuUsagePercent: parseFloat(this.getCpuUsage().toFixed(2)),
				memoryUsageMb: parseFloat(this.getMemoryUsage().toFixed(2)),
				heapUsagePercent: parseFloat(this.getHeapUsage().toFixed(2)),
			},
		};
	}

	private calculatePercentile(values: number[], percentile: number): number {
		if (values.length === 0) return 0;
		const sorted = [...values].sort((a, b) => a - b);
		const index = Math.ceil((percentile / 100) * sorted.length) - 1;
		return sorted[Math.max(0, index)];
	}

	private getCpuUsage(): number {
		const usage = process.cpuUsage();
		return parseFloat(((usage.user + usage.system) / 1000000).toFixed(2)); // Convert to seconds
	}

	private getMemoryUsage(): number {
		const usage = process.memoryUsage();
		return parseFloat((usage.heapUsed / 1024 / 1024).toFixed(2)); // Convert to MB
	}

	private getHeapUsage(): number {
		const usage = process.memoryUsage();
		return parseFloat(
			((usage.heapUsed / usage.heapTotal) * 100).toFixed(2),
		);
	}
}

export const metricsService = new MetricsService();
