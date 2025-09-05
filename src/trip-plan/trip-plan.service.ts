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

// ⬇️ add these to enable suggestions + geocoding + forecast
import { PlacesSuggestService } from 'src/places/places-suggest.service';
import { GeocodeService } from 'src/weather/geocode.service';
import { ForecastService } from 'src/weather/forecast.service';

type RequestTripInput = {
  place?: string; // free text place in Sri Lanka
  lat?: number;
  lon?: number;
  area?: string; // when provided, forecast for this area
  date?: string; // YYYY-MM-DD (optional)
};

@Injectable()
export class TripPlanService {
  private readonly logger = new Logger(TripPlanService.name);

  constructor(
    private prisma: PrismaService,
    private suggest: PlacesSuggestService,
    private geocode: GeocodeService,
    private forecast: ForecastService,
  ) {}

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

    // Single-date filtering (your schema uses a single "date" field)
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

  // ---------- UPDATE (areas diff) ----------

  /**
   * Update base TripPlan fields; and if `areas` provided:
   * - Keep areas whose `area` name exists in request.
   * - Create areas whose `area` name is new.
   * - Delete areas that are not present in request.
   *
   * Identification is by the `area` string (exact match).
   * Coordinates are **not** updated when area exists.
   */
  async update(dto: UpdateTripPlanDto): Promise<TripPlanDto> {
    const exists = await this.prisma.tripPlan.findUnique({
      where: { id: dto.id },
      include: { areas: true },
    });
    if (!exists) throw ExceptionFactory.trip('TRIP_NOT_FOUND');

    if (dto.areas && dto.areas.length === 0) {
      // If client chooses to send areas explicitly, enforce at least one
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
        const current = await tx.tripArea.findMany({
          where: { tripId: dto.id, deletedAt: null },
          select: { id: true, area: true },
        });

        const currentByName = new Map(current.map((a) => [a.area, a]));
        const incomingNames = new Set(dto.areas.map((a) => a.area));

        // delete areas absent in incoming
        const toDeleteIds = current
          .filter((a) => !incomingNames.has(a.area))
          .map((a) => a.id);

        // create areas not existing yet
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

    await this.prisma.tripPlan.delete({ where: { id } });
    return { id };
  }

  // ---------- SUGGESTIONS + FORECAST ----------
  /**
   * Planner entry:
   * - If no `area`: return weather-filtered place suggestions near lat/lon.
   * - If `area` + `date`: return one-day forecast for that area/date.
   * - If `area` only: return 30-day forecast for that area.
   * If lat/lon are missing but `place` is provided, we geocode it (Sri Lanka only).
   */
  async requestTripPlan(req: RequestTripInput) {
    let lat = req.lat;
    let lon = req.lon;

    if ((lat == null || lon == null) && req.place) {
      const hit = await this.geocode.geocodeLK(req.place);
      lat = hit.lat;
      lon = hit.lon;
    }
    if (lat == null || lon == null) {
      return {
        code: 400,
        message: 'Provide a place (Sri Lanka) or lat/lon.',
        data: null,
      };
    }

    // No area: suggestions near center point (30 km) filtered by weather
    if (!req.area) {
      const suggestions = await this.suggest.suggest({
        lat,
        lon,
        radius: 30000,
        kinds: 'tourism,natural,historic,park',
        minGoodDays: 1,
        limit: 40,
      });

      return {
        code: 200,
        message: 'OK',
        data: {
          mode: 'suggestions' as const,
          center: { lat, lon },
          suggestions,
          hint: 'Pick an area name and call again with { area } and optional { date }.',
        },
      };
    }

    // Have area: find it among nearby (to snap to the right coords)
    const nearby = await this.suggest.suggest({
      lat,
      lon,
      radius: 30000,
      kinds: 'tourism,natural,historic,park',
      limit: 60,
    });

    const chosen =
      nearby.find(
        (s) => s.place.name.toLowerCase() === req.area!.toLowerCase(),
      ) ?? null;

    let areaLat = chosen?.place.lat;
    let areaLon = chosen?.place.lon;

    // If not found in nearby list → try geocoding the area name
    if (areaLat == null || areaLon == null) {
      try {
        const hit = await this.geocode.geocodeLK(req.area);
        areaLat = hit.lat;
        areaLon = hit.lon;
      } catch {
        return {
          code: 404,
          message: 'Area not found near the given point.',
          data: null,
        };
      }
    }

    // One-day forecast
    if (req.date) {
      const one = await this.forecast.forecastByCoords(areaLat, areaLon, {
        date: req.date,
        vars: 'T2M,PRECIP',
        interp: '1',
      });

      const r = one?.data?.daily?.[0];
      const weatherNote =
        r?.precip_hi && r.precip_hi > 15
          ? 'Heavy rain expected — consider indoor activities.'
          : undefined;

      return {
        code: 200,
        message: 'OK',
        data: {
          mode: 'forecast-one' as const,
          center: { lat, lon },
          selectedArea: { name: req.area, lat: areaLat, lon: areaLon },
          date: req.date,
          daily: one.data.daily,
          note: weatherNote,
        },
      };
    }

    // 30-day forecast (no date)
    const fc = await this.forecast.forecastByCoords(areaLat, areaLon, {
      vars: 'T2M,PRECIP',
      interp: '1',
    });

    return {
      code: 200,
      message: 'OK',
      data: {
        mode: 'forecast-30' as const,
        center: { lat, lon },
        selectedArea: { name: req.area, lat: areaLat, lon: areaLon },
        window: fc.data.forecast_window,
        daily: fc.data.daily,
      },
    };
  }
}
