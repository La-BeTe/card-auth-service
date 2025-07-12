import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LedgerModule } from 'src/ledger/ledger.module';

@Module({
	controllers: [AuthController],
	providers: [AuthService],
	imports: [LedgerModule],
})
export class AuthModule {}
