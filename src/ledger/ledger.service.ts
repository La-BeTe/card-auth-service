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

	async recordAuthorization(dto: RecordAuthorizationDto): Promise<void> {
		const { cardPanToken, amountKobo, currency } = dto;

		let user = await this.prisma.account.findUnique({
			where: { cardPanToken },
		});
		if (!user || !!user.deletedAt) {
			throw new BadRequestException(
				`Account not found for token: ${cardPanToken}`,
			);
		}

		const system = await this.prisma.account.findUnique({
			where: { cardPanToken: SYSTEM_ACCOUNT_TOKEN },
		});
		if (!system || !!system.deletedAt) {
			throw new InternalServerErrorException(
				`System settlement account not found (token=${SYSTEM_ACCOUNT_TOKEN})`,
			);
		}

		const linkingRef = crypto.randomUUID();
		await this.prisma.entry.create({
			data: {
				currency,
				linkingRef,
				amountKobo,
				type: 'debit',
				accountId: user.id,
				counterpartyId: system.id,
			},
		});
		await this.prisma.entry.create({
			data: {
				currency,
				amountKobo,
				linkingRef,
				type: 'credit',
				accountId: system.id,
				counterpartyId: user.id,
			},
		});
	}
}
