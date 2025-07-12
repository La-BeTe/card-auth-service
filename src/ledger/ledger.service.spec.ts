import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('LedgerService', () => {
	let ledger: LedgerService;
	let prisma: PrismaService;

	const mockPrisma = {
		account: {
			findUnique: jest.fn(),
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
	});

	it('throws NotFoundException if account not found', async () => {
		mockPrisma.account.findUnique.mockResolvedValue(null);
		await expect(
			ledger.recordAuthorization({
				cardPanToken: 'unknown',
				amountKobo: 1000,
        currency: 'NGN',
			}),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('updates balance and writes two entries on success', async () => {
		const fakeAccount = { id: 1, walletBalanceKobo: 50000 };
		mockPrisma.account.findUnique.mockResolvedValue(fakeAccount);
		mockPrisma.account.update.mockResolvedValue({
			...fakeAccount,
			walletBalanceKobo: 40000,
		});

		await ledger.recordAuthorization({
			cardPanToken: 'tok_4242',
			amountKobo: 10000,
      currency: 'NGN'
		});

		expect(prisma.account.update).toHaveBeenCalledWith({
			where: { cardPanToken: 'tok_4242' },
			data: { walletBalanceKobo: 40000 },
		});
		expect(prisma.entry.create).toHaveBeenNthCalledWith(1, {
			data: { accountId: 1, type: 'debit', amountKobo: 10000 },
		});
		expect(prisma.entry.create).toHaveBeenNthCalledWith(2, {
			data: { accountId: 1, type: 'credit', amountKobo: 10000 },
		});
	});
});
