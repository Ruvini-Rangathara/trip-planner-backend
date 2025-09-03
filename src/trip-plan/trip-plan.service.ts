// src/trip-plan/trip-plan.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client'; // ⬅️ add this for strong types
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ExceptionFactory } from 'src/common/exception/exception.factory';
import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { TripPlanDto } from './dto/trip-plan.dto';
import { PlacesSuggestService } from 'src/places/places-suggest.service';
import { GeocodeService } from 'src/weather/geocode.service';
import { ForecastService } from 'src/weather/forecast.service';
import PrismaUtil from 'src/common/util/PrismaUtil';
import {
  GetAllTripPlanRequestDto,
  GetAllTripPlanResponseDto,
  GetOneTripPlanRequestDto,
  GetOneTripPlanResponseDto,
} from './dto/get-trip-plan.dto';

type WhenFilter = 'old' | 'future' | 'all';

interface RequestTripInput {
  place?: string;
  lat?: number;
  lon?: number;
  date?: string; // YYYY-MM-DD
  area?: string;
}

@Injectable()
export class TripPlanService {
  private readonly logger = new Logger(TripPlanService.name);

  constructor(
    private prisma: PrismaService,
    private suggest: PlacesSuggestService,
    private geocode: GeocodeService,
    private forecast: ForecastService,
  ) {}

  // ========== CRUD ==========

  async create(dto: CreateTripPlanDto): Promise<TripPlanDto> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    const created = await this.prisma.tripPlan.create({
      data: {
        title: dto.title,
        userId: dto.userId,
        startDate: start,
        endDate: end,
      },
      include: { areas: true, alerts: true },
    });

    await this.prisma.alert.create({
      data: {
        tripId: created.id,
        type: 'SUGGESTION',
        message:
          'Trip created. Add areas or request suggestions based on weather.',
      },
    });

    // ⬇️ do NOT call a non-existent findOne; return the created entity
    return new TripPlanDto(created);
  }

  async getAll(
    dto: GetAllTripPlanRequestDto,
  ): Promise<GetAllTripPlanResponseDto> {
    const now = new Date();

    const where: Prisma.TripPlanWhereInput = {
      userId: dto.userId,
      deletedAt: null,
    };

    if (dto.when === 'old') {
      where.endDate = { lt: now };
    } else if (dto.when === 'future') {
      where.startDate = { gte: now };
    }

    const pagination = PrismaUtil.paginate(dto) as {
      skip?: number;
      take?: number;
    };

    const [rows, count] = await this.prisma.$transaction([
      this.prisma.tripPlan.findMany({
        ...pagination,
        where,
        orderBy: { startDate: 'asc' },
        include: {
          areas: { where: { deletedAt: null } },
          alerts: { where: { deletedAt: null } },
        },
      }),
      this.prisma.tripPlan.count({ where }),
    ]);

    return new GetAllTripPlanResponseDto(
      count,
      rows.map((r) => new TripPlanDto(r)),
    );
  }

  async getOne(
    dto: GetOneTripPlanRequestDto,
  ): Promise<GetOneTripPlanResponseDto> {
    const row = await this.prisma.tripPlan.findFirst({
      where: { id: dto.id, deletedAt: null },
      include: {
        areas: { where: { deletedAt: null } },
        alerts: { where: { deletedAt: null } },
      },
    });

    if (!row) throw ExceptionFactory.trip('TRIP_NOT_FOUND');
    return new GetOneTripPlanResponseDto(row);
  }

  async listByUser(
    userId: string,
    when: WhenFilter = 'all',
  ): Promise<TripPlanDto[]> {
    const now = new Date();
    const base: Prisma.TripPlanWhereInput = { userId, deletedAt: null };

    const where: Prisma.TripPlanWhereInput =
      when === 'old'
        ? { ...base, endDate: { lt: now } }
        : when === 'future'
          ? { ...base, startDate: { gte: now } }
          : base;

    const rows = await this.prisma.tripPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { areas: true, alerts: { orderBy: { createdAt: 'desc' } } },
    });

    return rows.map((r) => new TripPlanDto(r));
  }
  async update(dto: UpdateTripPlanDto): Promise<TripPlanDto> {
    const exists = await this.prisma.tripPlan.findUnique({
      where: { id: dto.id },
    });
    if (!exists) throw ExceptionFactory.trip('TRIP_NOT_FOUND');

    const data: Prisma.TripPlanUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.userId !== undefined) {
      data.user = { connect: { id: dto.userId } }; // ⬅️ update relation properly
    }
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.tripPlan.update({
      where: { id: dto.id },
      data,
      include: { areas: true, alerts: { orderBy: { createdAt: 'desc' } } },
    });

    return new TripPlanDto(updated);
  }

  async remove(id: string): Promise<{ id: string }> {
    const exists = await this.prisma.tripPlan.findUnique({ where: { id } });
    if (!exists) throw ExceptionFactory.trip('TRIP_NOT_FOUND');

    await this.prisma.$transaction(async (tx) => {
      await tx.tripArea.deleteMany({ where: { tripId: id } });
      await tx.alert.deleteMany({ where: { tripId: id } });
      await tx.tripPlan.delete({ where: { id } });
    });

    return { id };
  }

  async replaceAreas(
    tripId: string,
    areas: { area: string; latitude: number; longitude: number }[],
  ): Promise<TripPlanDto> {
    const trip = await this.prisma.tripPlan.findUnique({
      where: { id: tripId },
    });
    if (!trip) throw ExceptionFactory.trip('TRIP_NOT_FOUND');

    const res = await this.prisma.$transaction(async (tx) => {
      await tx.tripArea.deleteMany({ where: { tripId } });
      if (areas.length) {
        await tx.tripArea.createMany({
          data: areas.map((a) => ({
            tripId,
            area: a.area,
            latitude: a.latitude,
            longitude: a.longitude,
          })),
        });
      }
      await tx.alert.create({
        data: { tripId, type: 'SUGGESTION', message: 'Trip areas updated.' },
      });

      return tx.tripPlan.findUnique({
        where: { id: tripId },
        include: { areas: true, alerts: { orderBy: { createdAt: 'desc' } } },
      });
    });

    if (!res) throw new NotFoundException('Trip not found after update');
    return new TripPlanDto(res);
  }

  // ========== Planner (suggestions + forecast) ==========

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
          mode: 'suggestions',
          center: { lat, lon },
          suggestions,
          hint: 'Pick an area name and call again with { area } and optional { date }.',
        },
      };
    }

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
          mode: 'forecast-one',
          center: { lat, lon },
          selectedArea: { name: req.area, lat: areaLat, lon: areaLon },
          date: req.date,
          daily: one.data.daily,
          note: weatherNote,
        },
      };
    }

    const fc = await this.forecast.forecastByCoords(areaLat, areaLon, {
      vars: 'T2M,PRECIP',
      interp: '1',
    });

    return {
      code: 200,
      message: 'OK',
      data: {
        mode: 'forecast-30',
        center: { lat, lon },
        selectedArea: { name: req.area, lat: areaLat, lon: areaLon },
        window: fc.data.forecast_window,
        daily: fc.data.daily,
      },
    };
  }
}
