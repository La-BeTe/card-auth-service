import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import {
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';

describe('LedgerService', () => {
	let ledger: LedgerService;
	let prisma: PrismaService;

	const mockPrisma = {
		account: {
			findUnique: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		entry: {
			create: jest.fn(),
		},
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LedgerService,
				{ provide: PrismaService, useValue: mockPrisma },
			],
		}).compile();

		ledger = module.get<LedgerService>(LedgerService);
		prisma = module.get<PrismaService>(PrismaService);

		// Reset mocks
		jest.clearAllMocks();
	});

	it('throws BadRequestException if user account not found', async () => {
		mockPrisma.account.findUnique.mockResolvedValue(null);

		await expect(
			ledger.recordAuthorization({
				cardPanToken: 'unknown-token',
				amountKobo: 10000,
				currency: 'NGN',
			}),
		).rejects.toThrow(BadRequestException);
	});

	it('throws InternalServerErrorException if system account not found', async () => {
		const fakeUserAccount = { id: 1, walletBalanceKobo: 50000 };
		mockPrisma.account.findUnique
			.mockResolvedValueOnce(fakeUserAccount) // User account found
			.mockResolvedValueOnce(null); // System account not found

		await expect(
			ledger.recordAuthorization({
				cardPanToken: 'tok_4242',
				amountKobo: 10000,
				currency: 'NGN',
			}),
		).rejects.toThrow(InternalServerErrorException);
	});

	it('creates debit and credit entries when both accounts exist', async () => {
		const fakeUserAccount = { id: 1, walletBalanceKobo: 50000 };
		const fakeSystemAccount = { id: 2, walletBalanceKobo: 100000 };

		mockPrisma.account.findUnique
			.mockResolvedValueOnce(fakeUserAccount) // User account found
			.mockResolvedValueOnce(fakeSystemAccount); // System account found

		await ledger.recordAuthorization({
			cardPanToken: 'tok_4242',
			amountKobo: 10000,
			currency: 'NGN',
		});

		expect(prisma.entry.create).toHaveBeenCalledTimes(2);
		expect(prisma.entry.create).toHaveBeenNthCalledWith(1, {
			data: {
				accountId: 1,
				type: 'debit',
				amountKobo: 10000,
				currency: 'NGN',
				counterpartyId: 2,
				linkingRef: expect.any(String),
			},
		});
		expect(prisma.entry.create).toHaveBeenNthCalledWith(2, {
			data: {
				accountId: 2,
				type: 'credit',
				amountKobo: 10000,
				currency: 'NGN',
				counterpartyId: 1,
				linkingRef: expect.any(String),
			},
		});
	});
});
