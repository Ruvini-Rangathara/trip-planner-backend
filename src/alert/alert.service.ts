import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ExceptionFactory } from 'src/common/exception/exception.factory';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { DeleteAlertDto } from './dto/delete-alert.dto';
import {
  GetAllAlertRequestDto,
  GetAllAlertResponseDto,
  GetOneAlertRequestDto,
  GetOneAlertResponseDto,
} from './dto/get-alert.dto';
import { AlertDto } from './dto/alert.dto';
import PrismaUtil from 'src/common/util/PrismaUtil';

@Injectable()
export class AlertService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAlertDto) {
    const trip = await this.prisma.tripPlan.findUnique({
      where: { id: dto.tripId },
    });
    if (!trip) throw ExceptionFactory.trip('TRIP_NOT_FOUND');

    const created = await this.prisma.alert.create({
      data: {
        tripId: dto.tripId,
        type: dto.type,
        message: dto.message,
      },
    });

    return new AlertDto(created);
  }

  async update(dto: UpdateAlertDto) {
    const exists = await this.prisma.alert.findUnique({
      where: { id: dto.id },
    });
    if (!exists) throw ExceptionFactory.alert('ALERT_NOT_FOUND');

    const updated = await this.prisma.alert.update({
      where: { id: dto.id, deletedAt: null },
      data: {
        // Only update provided fields
        ...(dto.tripId !== undefined ? { tripId: dto.tripId } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.message !== undefined ? { message: dto.message } : {}),
      },
    });

    return new AlertDto(updated);
  }

  async delete(dto: DeleteAlertDto) {
    const exists = await this.prisma.alert.findUnique({
      where: { id: dto.id },
    });
    if (!exists) throw ExceptionFactory.alert('ALERT_NOT_FOUND');

    await this.prisma.alert.delete({ where: { id: dto.id } });
    return { success: true };
  }

  async getOne(dto: GetOneAlertRequestDto) {
    const row = await this.prisma.alert.findUnique({
      where: { id: dto.id, deletedAt: null },
    });
    if (!row) throw ExceptionFactory.alert('ALERT_NOT_FOUND');

    return new GetOneAlertResponseDto(row);
  }

  async getAll(dto: GetAllAlertRequestDto) {
    const [rows, count] = await this.prisma.$transaction([
      this.prisma.alert.findMany({
        ...PrismaUtil.paginate(dto),
        orderBy: { createdAt: 'asc' },
        where: { deletedAt: null },
      }),
      this.prisma.alert.count(),
    ]);

    return new GetAllAlertResponseDto(
      count,
      rows.map((r) => new AlertDto(r)),
    );
  }
}
