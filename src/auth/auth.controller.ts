import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthorizeDto } from './dto/authorize.dto';
import { AuthService } from './auth.service';
import { idempotencyService } from '../common/idempotency.service';

@Controller('auth')
export class AuthController {
	constructor(private readonly authorizeService: AuthService) {}

	@Post()
	async authorize(@Body() body: AuthorizeDto) {
		if (idempotencyService.isDuplicate(body.idempotency_key)) {
			throw new BadRequestException('Duplicate request');
		}
		idempotencyService.markAsProcessing(body.idempotency_key);
		return await this.authorizeService.authorize(body);
	}
}
