import { Body, Controller, Post } from '@nestjs/common';
import { AuthorizeDto } from './dto/authorize.dto';
import { AuthService } from './auth.service';
import { idempotencyService } from '../common/idempotency.service';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authorizeService: AuthService,
	) {}

	@Post()
	async authorize(@Body() body: AuthorizeDto) {
		if (idempotencyService.isDuplicate(body.idempotency_key))
			throw new Error('Duplicate request');
		idempotencyService.markAsProcessed(body.idempotency_key);
		const result = this.authorizeService.authorize(body);
		return result;
	}
}
