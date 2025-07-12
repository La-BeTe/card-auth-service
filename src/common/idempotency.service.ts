import { InMemoryCache } from './cache.service';

class IdempotencyService {
	// how long to remember processed keys (in seconds)
	private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24h

	constructor(private readonly cache: InMemoryCache) {}

	/** Returns true if this key was already seen */
	async isDuplicate(key: string): Promise<boolean> {
		const existing = await this.cache.get(key);
		return existing !== null;
	}

	/** Marks a key as processed, so future calls are duplicates */
	async markAsProcessed(key: string): Promise<void> {
		await this.cache.set(key, 'processed', IdempotencyService.DEFAULT_TTL);
	}

	/** (optional) Remove a key early */
	async clearKey(key: string): Promise<void> {
		await this.cache.del(key);
	}
}


export const idempotencyService = new IdempotencyService(new InMemoryCache());
