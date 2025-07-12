import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LedgerService } from '../ledger/ledger.service';
import { idempotencyService } from '../common/idempotency.service';

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
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});

afterAll(() => {
	idempotencyService.cache && idempotencyService.cache.onModuleDestroy();
});
