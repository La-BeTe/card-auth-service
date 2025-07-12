import {
	IsString,
	IsNotEmpty,
	IsInt,
	Min,
	MaxLength,
	IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AuthorizeDto {
	@IsString()
	@IsNotEmpty()
	idempotency_key!: string;

	@IsString()
	@IsNotEmpty()
	card_pan_token!: string;

	@Min(0)
	@IsInt()
	@Type(() => Number)
	amount_kobo!: number;

	@IsString()
	@MaxLength(3)
	@IsNotEmpty()
	@IsIn(['NGN'])
	currency!: string;

	@Min(0)
	@IsInt()
	@Type(() => Number)
	wallet_balance_kobo!: number;
}
