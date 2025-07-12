import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { LedgerService } from '../ledger/ledger.service';

describe('AuthService', () => {
	let authService: AuthService;
	let ledgerService: LedgerService;

	const mockLedger = { recordAuthorization: jest.fn() };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: LedgerService, useValue: mockLedger },
			],
		}).compile();

		authService = module.get<AuthService>(AuthService);
		ledgerService = module.get<LedgerService>(LedgerService);

		// Reset mocks
		jest.clearAllMocks();
	});

	it('approves when balance ≥ amount and records to ledger', async () => {
		const result = await authService.authorize({
			idempotency_key: 'key1',
			card_pan_token: 'tok_4242',
			amount_kobo: 30000,
			wallet_balance_kobo: 80000,
			currency: 'NGN',
		});
		expect(result.approved).toBe(true);
		expect(result.balance_left).toBe(50000);
		expect(mockLedger.recordAuthorization).toHaveBeenCalledTimes(1);
	});

	it('declines when balance < amount and does NOT record', async () => {
		const result = await authService.authorize({
			idempotency_key: 'key2',
			card_pan_token: 'tok_4242',
			amount_kobo: 90000,
			wallet_balance_kobo: 80000,
			currency: 'NGN',
		});
		expect(result.approved).toBe(false);
		expect(result.balance_left).toBe(80000);
		expect(mockLedger.recordAuthorization).not.toHaveBeenCalled();
	});

	it('handles zero-amount authorizations gracefully', async () => {
		const result = await authService.authorize({
			idempotency_key: 'zero-key',
			card_pan_token: 'tok_4242',
			amount_kobo: 0,
			wallet_balance_kobo: 0,
			currency: 'NGN',
		});
		expect(result.approved).toBe(true);
		expect(result.balance_left).toBe(0);
		expect(mockLedger.recordAuthorization).toHaveBeenCalled();
	});
});
