import { Injectable } from '@nestjs/common';
import { AuthorizeDto } from './dto/authorize.dto';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class AuthService {
	constructor(private readonly ledgerService: LedgerService) {}

	authorize(authDto: AuthorizeDto) {
		const balanceLeft = authDto.wallet_balance_kobo - authDto.amount_kobo;
		if (balanceLeft < 0) {
			return {
				approved: false,
				auth_code: '51',
				balance_left: authDto.wallet_balance_kobo,
			};
		}
		this.ledgerService.recordAuthorization({
			currency: authDto.currency,
			amountKobo: authDto.amount_kobo,
			cardPanToken: authDto.card_pan_token,
		});
		return {
			approved: true,
			auth_code: '00',
			balance_left: balanceLeft,
		};
	}
}
