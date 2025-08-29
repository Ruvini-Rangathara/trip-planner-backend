import { Module } from '@nestjs/common';
import { AreaService } from './area.service';
import { AreaController } from './area.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [AreaController],
  providers: [AreaService, PrismaService],
})
export class AreaModule {}
