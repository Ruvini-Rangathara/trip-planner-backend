// src/trip-plan/trip-plan.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ExceptionFactory } from 'src/common/exception/exception.factory';

import {
  CreateTripPlanDto,
  TripAreaInputDto,
} from './dto/create-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { TripPlanDto } from './dto/trip-plan.dto';

import {
  GetAllTripPlanRequestDto,
  GetAllTripPlanResponseDto,
  GetOneTripPlanRequestDto,
  GetOneTripPlanResponseDto,
} from './dto/get-trip-plan.dto';

import PrismaUtil from 'src/common/util/PrismaUtil';

@Injectable()
export class TripPlanService {
  private readonly logger = new Logger(TripPlanService.name);

  constructor(private prisma: PrismaService) {}

  // ---------- CREATE ----------

  async create(dto: CreateTripPlanDto): Promise<TripPlanDto> {
    if (!dto.areas || dto.areas.length === 0) {
      throw ExceptionFactory.trip('TRIP_AREAS_REQUIRED');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // 1) Create base trip
      const base = await tx.tripPlan.create({
        data: {
          title: dto.title,
          userId: dto.userId,
          date: new Date(dto.date),
          ...(dto.status ? { status: dto.status } : {}),
        },
      });

      // 2) Create areas linked to trip
      await tx.tripArea.createMany({
        data: dto.areas.map((a: TripAreaInputDto) => ({
          tripId: base.id,
          area: a.area,
          latitude: a.lat,
          longitude: a.lng,
        })),
      });

      // 3) Return complete trip with areas
      return tx.tripPlan.findUnique({
        where: { id: base.id },
        include: { areas: { where: { deletedAt: null } } },
      });
    });

    if (!created) throw new NotFoundException('Trip not found after create');
    return new TripPlanDto(created);
  }

  // ---------- READ: GET ALL ----------

  async getAll(
    dto: GetAllTripPlanRequestDto,
  ): Promise<GetAllTripPlanResponseDto> {
    const now = new Date();
    const where: Prisma.TripPlanWhereInput = {
      userId: dto.userId,
      deletedAt: null,
    };

    // Single-date filtering
    if (dto.when === 'old') where.date = { lt: now };
    else if (dto.when === 'future') where.date = { gte: now };

    const pagination = PrismaUtil.paginate(dto) as {
      skip?: number;
      take?: number;
    };

    const [rows, count] = await this.prisma.$transaction([
      this.prisma.tripPlan.findMany({
        ...pagination,
        where,
        orderBy: { date: 'asc' },
        include: {
          areas: { where: { deletedAt: null } },
        },
      }),
      this.prisma.tripPlan.count({ where }),
    ]);

    return new GetAllTripPlanResponseDto(
      count,
      rows.map((r) => new TripPlanDto(r)),
    );
  }

  // ---------- READ: GET ONE ----------

  async getOne(
    dto: GetOneTripPlanRequestDto,
  ): Promise<GetOneTripPlanResponseDto> {
    const row = await this.prisma.tripPlan.findFirst({
      where: { id: dto.id, deletedAt: null },
      include: {
        areas: { where: { deletedAt: null } },
      },
    });

    if (!row) throw ExceptionFactory.trip('TRIP_NOT_FOUND');
    return new GetOneTripPlanResponseDto(row);
  }

  // ---------- UPDATE (focus on areas diff) ----------

  /**
   * Update base TripPlan fields; and if `areas` provided:
   * - Keep areas whose `area` name exists in request.
   * - Create areas whose `area` name is new.
   * - Delete areas that are not present in request.
   *
   * Identification is by the `area` string (exact match).
   * Coordinates are **not** updated when area exists (as requested).
   */
  async update(dto: UpdateTripPlanDto): Promise<TripPlanDto> {
    const exists = await this.prisma.tripPlan.findUnique({
      where: { id: dto.id },
      include: { areas: true },
    });
    if (!exists) throw ExceptionFactory.trip('TRIP_NOT_FOUND');

    if (dto.areas && dto.areas.length === 0) {
      // Enforce at least one area if client chooses to send areas explicitly
      throw ExceptionFactory.trip('TRIP_AREAS_REQUIRED');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1) Update base fields
      const baseData: Prisma.TripPlanUpdateInput = {};
      if (dto.title !== undefined) baseData.title = dto.title;
      if (dto.userId !== undefined)
        baseData.user = { connect: { id: dto.userId } };
      if (dto.date !== undefined) baseData.date = new Date(dto.date);
      if (dto.status !== undefined) baseData.status = dto.status;

      if (Object.keys(baseData).length) {
        await tx.tripPlan.update({ where: { id: dto.id }, data: baseData });
      }

      // 2) Sync areas if provided
      if (dto.areas) {
        // Current areas (non-deleted)
        const current = await tx.tripArea.findMany({
          where: { tripId: dto.id, deletedAt: null },
          select: { id: true, area: true },
        });

        const currentByName = new Map(current.map((a) => [a.area, a]));
        const incomingNames = new Set(dto.areas.map((a) => a.area));

        // Find toDelete = existing names not in incoming
        const toDeleteIds = current
          .filter((a) => !incomingNames.has(a.area))
          .map((a) => a.id);

        // Find toCreate = incoming names not existing yet
        const toCreate = dto.areas.filter((a) => !currentByName.has(a.area));

        if (toDeleteIds.length) {
          await tx.tripArea.deleteMany({ where: { id: { in: toDeleteIds } } });
        }
        if (toCreate.length) {
          await tx.tripArea.createMany({
            data: toCreate.map((a) => ({
              tripId: dto.id,
              area: a.area,
              latitude: a.lat,
              longitude: a.lng,
            })),
          });
        }
      }

      // 3) Return full updated trip with areas
      return tx.tripPlan.findUnique({
        where: { id: dto.id },
        include: { areas: { where: { deletedAt: null } } },
      });
    });

    if (!updated) throw new NotFoundException('Trip not found after update');
    return new TripPlanDto(updated);
  }

  // ---------- DELETE ----------

  async remove(id: string): Promise<{ id: string }> {
    const exists = await this.prisma.tripPlan.findUnique({ where: { id } });
    if (!exists) throw ExceptionFactory.trip('TRIP_NOT_FOUND');

    // onDelete: Cascade on relations handles TripArea rows
    await this.prisma.tripPlan.delete({ where: { id } });
    return { id };
  }
}
