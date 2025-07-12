import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
	controllers: [LedgerController],
	providers: [LedgerService],
	exports: [LedgerService],
	imports: [PrismaModule],
})
export class LedgerModule {}
