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

	// Rows that would be visible in the database after the call returns.
	let committed: any[] = [];

	// The underlying write; tests make it fail to simulate a database error.
	const entryWrite = jest.fn();

	const mockPrisma = {
		account: {
			findUnique: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		// Outside a transaction a write is committed immediately.
		entry: {
			create: jest.fn(async (args) => {
				await entryWrite(args);
				committed.push(args.data);
			}),
		},
		// Inside a transaction writes are staged and only committed if the
		// callback resolves; a throw discards them, like a rollback.
		$transaction: jest.fn(async (fn) => {
			const staged: any[] = [];
			const tx = {
				entry: {
					create: async (args) => {
						await entryWrite(args);
						staged.push(args.data);
					},
				},
			};
			const result = await fn(tx);
			committed.push(...staged);
			return result;
		}),
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
		committed = [];
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

		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(entryWrite).toHaveBeenCalledTimes(2);
		expect(committed).toHaveLength(2);
		expect(committed[0].linkingRef).toBe(committed[1].linkingRef);
		expect(entryWrite).toHaveBeenNthCalledWith(1, {
			data: {
				accountId: 1,
				type: 'debit',
				amountKobo: 10000,
				currency: 'NGN',
				counterpartyId: 2,
				linkingRef: expect.any(String),
			},
		});
		expect(entryWrite).toHaveBeenNthCalledWith(2, {
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

	it('leaves no entries behind when the credit leg fails', async () => {
		mockPrisma.account.findUnique
			.mockResolvedValueOnce({ id: 1 }) // User account found
			.mockResolvedValueOnce({ id: 2 }); // System account found
		entryWrite
			.mockResolvedValueOnce(undefined) // debit succeeds
			.mockRejectedValueOnce(new Error('connection lost')); // credit fails

		await expect(
			ledger.recordAuthorization({
				cardPanToken: 'tok_4242',
				amountKobo: 10000,
				currency: 'NGN',
			}),
		).rejects.toThrow('connection lost');

		expect(entryWrite).toHaveBeenCalledTimes(2);
		expect(committed).toHaveLength(0);
	});
});
