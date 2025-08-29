import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ExceptionFactory } from 'src/common/exception/exception.factory';

import { CreateAreaDto } from './dto/create-area.dto';
import { DeleteAreaDto } from './dto/delete-area.dto';
import {
  GetAllAreaRequestDto,
  GetAllAreaResponseDto,
  GetOneAreaRequestDto,
  GetOneAreaResponseDto,
} from './dto/get-area.dto';
import { AreaDto } from './dto/area.dto';
import PrismaUtil from 'src/common/util/PrismaUtil';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAreaDto) {
    const area = await this.prisma.area.create({
      data: {
        ...dto,
      },
    });

    return new AreaDto(area);
  }

  async update(dto: UpdateAreaDto) {
    const existing = await this.prisma.area.findUnique({
      where: { id: dto.id },
    });
    if (!existing) throw ExceptionFactory.area('AREA_NOT_FOUND');

    const area = await this.prisma.area.update({
      where: { id: dto.id },
      data: {
        ...dto,
      },
    });

    return new AreaDto(area);
  }

  async delete(dto: DeleteAreaDto) {
    const existing = await this.prisma.area.findUnique({
      where: { id: dto.id },
    });
    if (!existing) throw ExceptionFactory.area('AREA_NOT_FOUND');

    await this.prisma.area.delete({ where: { id: dto.id } });
    return { success: true };
  }

  async getOne(dto: GetOneAreaRequestDto) {
    const area = await this.prisma.area.findUnique({
      where: { id: dto.id },
    });
    if (!area) throw ExceptionFactory.area('AREA_NOT_FOUND');

    return new GetOneAreaResponseDto(area);
  }

  async getAll(dto: GetAllAreaRequestDto) {
    const [rows, count] = await this.prisma.$transaction([
      this.prisma.area.findMany({
        ...PrismaUtil.paginate(dto),
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.area.count(),
    ]);

    return new GetAllAreaResponseDto(
      count,
      rows.map((r) => new AreaDto(r)),
    );
  }
}
