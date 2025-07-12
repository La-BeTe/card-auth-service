import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AuthorizeDto {
	@IsString()
	@IsNotEmpty()
	idempotency_key!: string;

	@IsString()
	@IsNotEmpty()
	card_pan_token!: string;

	@Type(() => Number)
	@IsInt()
	@Min(0)
	amount_kobo!: number;

	@IsString()
	@IsNotEmpty()
	currency!: string;

	@Type(() => Number)
	@IsInt()
	@Min(0)
	wallet_balance_kobo!: number;
}
