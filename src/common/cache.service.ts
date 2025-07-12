import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface CacheEntry {
	value: string;
	expiresAt?: number;
}

@Injectable()
export class InMemoryCache implements OnModuleDestroy {
	private store = new Map<string, CacheEntry>();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		// periodically purge expired keys
		this.cleanupInterval = setInterval(() => {
			const now = Date.now();
			for (const [key, entry] of this.store) {
				if (entry.expiresAt && entry.expiresAt <= now) {
					this.store.delete(key);
				}
			}
		}, 60_000); // every 60s
	}

	/** Mimics Redis GET */
	get(key: string): string | null {
		const entry = this.store.get(key);
		if (!entry) return null;
		if (entry.expiresAt && entry.expiresAt <= Date.now()) {
			this.store.delete(key);
			return null;
		}
		return entry.value;
	}

	/** Mimics Redis SET with optional TTL in seconds */
	set(key: string, value: string, ttlSeconds?: number): void {
		const entry: CacheEntry = { value };
		if (ttlSeconds) {
			entry.expiresAt = Date.now() + ttlSeconds * 1000;
		}
		this.store.set(key, entry);
	}

	/** Mimics Redis DEL */
	del(key: string): number {
		return this.store.delete(key) ? 1 : 0;
	}

	onModuleDestroy() {
		clearInterval(this.cleanupInterval);
	}
}
