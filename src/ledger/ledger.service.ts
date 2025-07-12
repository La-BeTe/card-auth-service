import {
	Injectable,
	BadRequestException,
	InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_ACCOUNT_TOKEN =
	process.env.SYSTEM_ACCOUNT_TOKEN || 'SYSTEM_SETTLEMENT';

export interface RecordAuthorizationDto {
	cardPanToken: string;
	amountKobo: number;
	currency: string;
}

@Injectable()
export class LedgerService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Records a successful authorization:
	 * 1. Find the user account (must exist & not deleted)
	 * 2. Find the system settlement account
	 * 3. Ensure user.balance >= amount
	 * 4. Deduct from user, add to system
	 * 5. Write a debit entry (user) and a credit entry (system)
	 */
	async recordAuthorization(dto: RecordAuthorizationDto): Promise<void> {
		const { cardPanToken, amountKobo, currency } = dto;

		// 1. User account
		let user = await this.prisma.account.findUnique({
			where: { cardPanToken },
		});
		if (!user || !!user.deletedAt) {
            user = await this.prisma.account.create({
                data: { cardPanToken }
            })
			// throw new BadRequestException(
			// 	`Account not found for token: ${cardPanToken}`,
			// );
		}

		// 2. System settlement account
		const system = await this.prisma.account.findUnique({
			where: { cardPanToken: SYSTEM_ACCOUNT_TOKEN },
		});
		if (!system || !!system.deletedAt) {
			throw new InternalServerErrorException(
				`System settlement account not found (token=${SYSTEM_ACCOUNT_TOKEN})`,
			);
		}

		// 3. Balance check
		// if (user.walletBalanceKobo < amountKobo) {
		// throw new BadRequestException('Insufficient wallet balance');
		// }

		// 4. Calculate new balances
		// const newUserBalance = user.walletBalanceKobo - amountKobo;
		// const newSystemBalance = system.walletBalanceKobo + amountKobo;

		// 5. Persist balance updates
		// const updatedUser = await this.prisma.account.update({
		// where: { cardPanToken },
		// data: { walletBalanceKobo: newUserBalance },
		// });
		// const updatedSystem = await this.prisma.account.update({
		// where: { cardPanToken: SYSTEM_ACCOUNT_TOKEN },
		// data: { walletBalanceKobo: newSystemBalance },
		// });

		// 6. Write ledger entries
		await this.prisma.entry.create({
			data: {
				accountId: user.id,
				type: 'debit',
				amountKobo,
				currency,
				counterpartyId: system.id,
			},
		});
		await this.prisma.entry.create({
			data: {
				amountKobo,
				type: 'credit',
				accountId: system.id,
				currency,
				counterpartyId: user.id,
			},
		});
	}
}
