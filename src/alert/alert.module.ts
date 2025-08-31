import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [AlertController],
  providers: [AlertService, PrismaService],
})
export class AlertModule {}
