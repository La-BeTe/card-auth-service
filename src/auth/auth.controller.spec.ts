import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LedgerService } from '../ledger/ledger.service';
import { idempotencyService } from '../common/idempotency.service';
import { BadRequestException } from '@nestjs/common';
import { AuthorizeDto } from './dto/authorize.dto';

describe('AuthController', () => {
	let controller: AuthController;

	const mockLedgerService = { recordAuthorization: jest.fn() };
	const mockAuthService = { authorize: jest.fn() };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{ provide: AuthService, useValue: mockAuthService },
				{ provide: LedgerService, useValue: mockLedgerService },
			],
		}).compile();

		controller = module.get<AuthController>(AuthController);
		jest.clearAllMocks();
	});

	const request = (key: string): AuthorizeDto => ({
		idempotency_key: key,
		card_pan_token: 'TEST_TOKEN',
		amount_kobo: 1000,
		currency: 'NGN',
		wallet_balance_kobo: 5000,
	});
	const approved = { approved: true, auth_code: '00', balance_left: 4000 };

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('rejects a repeat of a request that succeeded', async () => {
		mockAuthService.authorize.mockResolvedValueOnce(approved);

		await expect(controller.authorize(request('ok-key'))).resolves.toEqual(
			approved,
		);
		await expect(controller.authorize(request('ok-key'))).rejects.toThrow(
			BadRequestException,
		);
		expect(mockAuthService.authorize).toHaveBeenCalledTimes(1);
	});

	it('rejects a repeat while the first request is still in flight', async () => {
		let finish: (v: unknown) => void = () => {};
		mockAuthService.authorize.mockReturnValueOnce(
			new Promise((resolve) => (finish = resolve)),
		);

		const first = controller.authorize(request('inflight-key'));
		await expect(
			controller.authorize(request('inflight-key')),
		).rejects.toThrow(BadRequestException);

		finish(approved);
		await expect(first).resolves.toEqual(approved);
		expect(mockAuthService.authorize).toHaveBeenCalledTimes(1);
	});

	it('frees the key when processing fails so the client can retry', async () => {
		mockAuthService.authorize
			.mockRejectedValueOnce(new Error('db down'))
			.mockResolvedValueOnce(approved);

		await expect(
			controller.authorize(request('retry-key')),
		).rejects.toThrow('db down');
		await expect(
			controller.authorize(request('retry-key')),
		).resolves.toEqual(approved);
		expect(mockAuthService.authorize).toHaveBeenCalledTimes(2);

		// Once it has succeeded, the key is taken.
		await expect(
			controller.authorize(request('retry-key')),
		).rejects.toThrow(BadRequestException);
	});
});

afterAll(() => {
	idempotencyService.cache && idempotencyService.cache.onModuleDestroy();
});
