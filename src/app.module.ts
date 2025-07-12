import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { LedgerModule } from './ledger/ledger.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
	imports: [AuthModule, LedgerModule, PrismaModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
