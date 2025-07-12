import { InMemoryCache } from './cache.service';

class IdempotencyService {
	private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24h

	public readonly cache: InMemoryCache;

	constructor(cache: InMemoryCache) {
		this.cache = cache;
	}

	isDuplicate(key: string): boolean {
		const existing = this.cache.get(key);
		return existing !== null;
	}

	markAsProcessing(key: string): void {
		this.cache.set(key, 'processing', IdempotencyService.DEFAULT_TTL);
	}

	clearKey(key: string): void {
		this.cache.del(key);
	}
}

export const idempotencyService = new IdempotencyService(new InMemoryCache());
