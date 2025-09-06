// cspell:words Mirissa precip PRECIP interp geocodes

/* eslint-disable @typescript-eslint/unbound-method */
/* We don't use 'jest/unbound-method' – some setups don't ship that rule */

// Minimal, typed unit tests for TripPlanService

import { Test, TestingModule } from '@nestjs/testing';
import { TripPlanService } from './trip-plan.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import PrismaUtil from 'src/common/util/PrismaUtil';

import { PlacesSuggestService } from 'src/places/places-suggest.service';
import { GeocodeService } from 'src/weather/geocode.service';
import { ForecastService } from 'src/weather/forecast.service';

import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import {
  GetAllTripPlanRequestDto,
  GetOneTripPlanRequestDto,
} from './dto/get-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { TripStatus } from '@prisma/client';

/* -----------------------------
 * Test-only data types
 * ----------------------------- */
type DbTripArea = {
  id: string;
  tripId: string;
  area: string;
  latitude: number;
  longitude: number;
  deletedAt: Date | null;
};

type DbTripPlan = {
  id: string;
  userId: string;
  title: string;
  date: Date;
  status: TripStatus;
  deletedAt: Date | null;
  areas?: DbTripArea[];
};

type SuggestItem = {
  place: { name: string; lat: number; lon: number };
  score?: number;
};

type GeocodeHit = { lat: number; lon: number };

type ForecastEnvelope = {
  data: { daily: unknown[]; forecast_window?: unknown };
};

/* -----------------------------
 * Helpers
 * ----------------------------- */
function makeArea(p: Partial<DbTripArea> = {}): DbTripArea {
  return {
    id: p.id ?? 'a1',
    tripId: p.tripId ?? 't1',
    area: p.area ?? 'Ella',
    latitude: p.latitude ?? 6.8667,
    longitude: p.longitude ?? 81.0499,
    deletedAt: p.deletedAt ?? null,
  };
}

function makeTrip(p: Partial<DbTripPlan> = {}): DbTripPlan {
  return {
    id: p.id ?? 't1',
    userId: p.userId ?? 'u1',
    title: p.title ?? 'My Trip',
    date: p.date ?? new Date('2024-08-01T00:00:00Z'),
    status: p.status ?? 'PLANNED',
    deletedAt: p.deletedAt ?? null,
    areas: p.areas ?? [makeArea({})],
  };
}

/* -----------------------------
 * Typed Prisma delegate mocks
 * ----------------------------- */
type TripPlanDelegateMock = {
  create: jest.Mock<Promise<DbTripPlan>, [unknown]>;
  findUnique: jest.Mock<Promise<DbTripPlan | null>, [unknown]>;
  findFirst: jest.Mock<Promise<DbTripPlan | null>, [unknown]>;
  findMany: jest.Mock<Promise<DbTripPlan[]>, [unknown]>;
  update: jest.Mock<Promise<DbTripPlan>, [unknown]>;
  delete: jest.Mock<Promise<DbTripPlan>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
};

type TripAreaDelegateMock = {
  createMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
  findMany: jest.Mock<
    Promise<Array<Pick<DbTripArea, 'id' | 'area'>>>,
    [unknown]
  >;
  deleteMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
};

describe('TripPlanService', () => {
  let service: TripPlanService;

  let tripPlan: TripPlanDelegateMock;
  let tripArea: TripAreaDelegateMock;

  // external services (typed mocks)
  let suggest: jest.Mocked<PlacesSuggestService>;
  let geocode: jest.Mocked<GeocodeService>;
  let forecast: jest.Mocked<ForecastService>;

  let paginateSpy: jest.SpiedFunction<typeof PrismaUtil.paginate>;

  beforeEach(async () => {
    // Build each jest.fn with correct generics to avoid "unsafe-assignment"
    tripPlan = {
      create: jest.fn<Promise<DbTripPlan>, [unknown]>(),
      findUnique: jest.fn<Promise<DbTripPlan | null>, [unknown]>(),
      findFirst: jest.fn<Promise<DbTripPlan | null>, [unknown]>(),
      findMany: jest.fn<Promise<DbTripPlan[]>, [unknown]>(),
      update: jest.fn<Promise<DbTripPlan>, [unknown]>(),
      delete: jest.fn<Promise<DbTripPlan>, [unknown]>(),
      count: jest.fn<Promise<number>, [unknown]>(),
    };

    tripArea = {
      createMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
      findMany: jest.fn<
        Promise<Array<Pick<DbTripArea, 'id' | 'area'>>>,
        [unknown]
      >(),
      deleteMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
    };

    // Simple $transaction mock supporting callback & array forms
    const $transaction = ((arg: unknown) => {
      if (typeof arg === 'function') {
        // callback form
        const tx = {
          tripPlan,
          tripArea,
        } as unknown as Pick<PrismaService, 'tripPlan' | 'tripArea'>;
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        return (arg as (t: typeof tx) => unknown | Promise<unknown>)(tx);
      }
      if (Array.isArray(arg)) {
        // array form
        return Promise.all(arg as Array<Promise<unknown>>);
      }
      return Promise.resolve(undefined);
    }) as unknown as PrismaService['$transaction'];

    suggest = {
      suggest: jest.fn(),
    } as unknown as jest.Mocked<PlacesSuggestService>;
    geocode = {
      geocodeLK: jest.fn(),
    } as unknown as jest.Mocked<GeocodeService>;
    forecast = {
      forecastByCoords: jest.fn(),
    } as unknown as jest.Mocked<ForecastService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripPlanService,
        // Provide only what the service uses; cast at the boundary
        {
          provide: PrismaService,
          useValue: {
            tripPlan: tripPlan as unknown,
            tripArea: tripArea as unknown,
            $transaction,
          } as unknown as PrismaService,
        },
        { provide: PlacesSuggestService, useValue: suggest },
        { provide: GeocodeService, useValue: geocode },
        { provide: ForecastService, useValue: forecast },
      ],
    }).compile();

    service = module.get(TripPlanService);

    paginateSpy = jest.spyOn(PrismaUtil, 'paginate').mockReturnValue({
      skip: 0,
      take: 10,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -----------------------------
   * create
   * ----------------------------- */
  it('create: creates trip and areas in a transaction', async () => {
    const dto: CreateTripPlanDto = {
      userId: 'u1',
      title: 'Trip A',
      date: '2024-08-10',
      areas: [
        { area: 'Ella', lat: 6.8667, lng: 81.0499 },
        { area: 'Mirissa', lat: 5.9485, lng: 80.4713 },
      ],
    };

    const createdBase = makeTrip({
      id: 't100',
      title: 'Trip A',
      userId: 'u1',
      date: new Date('2024-08-10T00:00:00Z'),
      areas: [],
    });

    tripPlan.create.mockResolvedValueOnce(createdBase);
    tripArea.createMany.mockResolvedValueOnce({ count: 2 });

    const finalTrip = makeTrip({
      id: 't100',
      title: 'Trip A',
      userId: 'u1',
      areas: [
        makeArea({ id: 'a1', tripId: 't100', area: 'Ella' }),
        makeArea({ id: 'a2', tripId: 't100', area: 'Mirissa' }),
      ],
    });
    tripPlan.findUnique.mockResolvedValueOnce(finalTrip);

    const out = await service.create(dto);

    expect(tripPlan.create).toHaveBeenCalledTimes(1);
    expect(tripArea.createMany).toHaveBeenCalledTimes(1);
    expect(tripPlan.findUnique).toHaveBeenCalledWith({
      where: { id: 't100' },
      include: { areas: { where: { deletedAt: null } } },
    });
    expect(out.title).toBe('Trip A');
    expect(out.areas.length).toBe(2);
  });

  it('create: throws when areas missing', async () => {
    await expect(
      service.create({
        userId: 'u1',
        title: 'X',
        date: '2024-08-10',
        areas: [],
      } as unknown as CreateTripPlanDto),
    ).rejects.toBeDefined();
  });

  /* -----------------------------
   * getAll
   * ----------------------------- */
  it('getAll: returns filtered & paginated trips', async () => {
    const req: GetAllTripPlanRequestDto = {
      userId: 'u1',
      when: 'all',
      page: 1,
      size: 10,
    } as GetAllTripPlanRequestDto;

    paginateSpy.mockReturnValueOnce({ skip: 0, take: 10 });

    const rows = [
      makeTrip({ id: 't1', date: new Date('2024-07-01T00:00:00Z') }),
      makeTrip({ id: 't2', date: new Date('2024-08-01T00:00:00Z') }),
    ];
    tripPlan.findMany.mockResolvedValueOnce(rows);
    tripPlan.count.mockResolvedValueOnce(2);

    const out = await service.getAll(req);

    expect(paginateSpy).toHaveBeenCalledWith(req);
    expect(tripPlan.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      where: { userId: 'u1', deletedAt: null },
      orderBy: { date: 'asc' },
      include: { areas: { where: { deletedAt: null } } },
    });
    expect(tripPlan.count).toHaveBeenCalledWith({
      where: { userId: 'u1', deletedAt: null },
    });

    expect((out as unknown as { count: number }).count).toBe(2);
  });

  /* -----------------------------
   * getOne
   * ----------------------------- */
  it('getOne: returns a trip', async () => {
    const row = makeTrip({ id: 't9' });
    tripPlan.findFirst.mockResolvedValueOnce(row);

    const req: GetOneTripPlanRequestDto = { id: 't9' };
    const out = await service.getOne(req);

    expect(tripPlan.findFirst).toHaveBeenCalledWith({
      where: { id: 't9', deletedAt: null },
      include: { areas: { where: { deletedAt: null } } },
    });
    expect((out as unknown as { id: string }).id).toBe('t9');
  });

  it('getOne: throws when not found', async () => {
    tripPlan.findFirst.mockResolvedValueOnce(null);
    await expect(service.getOne({ id: 'none' })).rejects.toBeDefined();
  });

  /* -----------------------------
   * update (areas diff)
   * ----------------------------- */
  it('update: diff areas and update base fields', async () => {
    const existing = makeTrip({
      id: 't200',
      title: 'Old',
      areas: [
        makeArea({ id: 'ea', area: 'Ella', tripId: 't200' }),
        makeArea({ id: 'ga', area: 'Galle', tripId: 't200' }),
      ],
    });

    tripPlan.findUnique.mockResolvedValueOnce(existing); // existence
    tripPlan.update.mockResolvedValueOnce(
      makeTrip({ id: 't200', title: 'New Title' }),
    );

    tripArea.findMany.mockResolvedValueOnce([
      { id: 'ea', area: 'Ella' },
      { id: 'ga', area: 'Galle' },
    ]);
    tripArea.deleteMany.mockResolvedValueOnce({ count: 1 }); // delete Galle
    tripArea.createMany.mockResolvedValueOnce({ count: 1 }); // create Mirissa

    const finalTrip = makeTrip({
      id: 't200',
      title: 'New Title',
      areas: [
        makeArea({ id: 'ea', area: 'Ella', tripId: 't200' }),
        makeArea({ id: 'mi', area: 'Mirissa', tripId: 't200' }),
      ],
    });
    tripPlan.findUnique.mockResolvedValueOnce(finalTrip);

    const dto: UpdateTripPlanDto = {
      id: 't200',
      title: 'New Title',
      areas: [
        { area: 'Ella', lat: 6.86, lng: 81.04 }, // keep
        { area: 'Mirissa', lat: 5.94, lng: 80.47 }, // create
      ],
    };

    const out = await service.update(dto);

    expect(tripPlan.update).toHaveBeenCalledWith({
      where: { id: 't200' },
      data: { title: 'New Title' },
    });
    expect(tripArea.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['ga'] } },
    });
    expect(tripArea.createMany).toHaveBeenCalledWith({
      data: [
        {
          tripId: 't200',
          area: 'Mirissa',
          latitude: 5.94,
          longitude: 80.47,
        },
      ],
    });
    expect((out as unknown as { title: string }).title).toBe('New Title');
  });

  it('update: throws when trip not found', async () => {
    tripPlan.findUnique.mockResolvedValueOnce(null);
    await expect(service.update({ id: 'bad' })).rejects.toBeDefined();
  });

  it('update: throws when areas provided but empty', async () => {
    tripPlan.findUnique.mockResolvedValueOnce(makeTrip({ id: 't-x' }));
    await expect(
      service.update({ id: 't-x', areas: [] }),
    ).rejects.toBeDefined();
  });

  /* -----------------------------
   * remove
   * ----------------------------- */
  it('remove: deletes existing trip', async () => {
    tripPlan.findUnique.mockResolvedValueOnce(makeTrip({ id: 't300' }));
    tripPlan.delete.mockResolvedValueOnce(makeTrip({ id: 't300' }));

    const out = await service.remove('t300');
    expect(tripPlan.findUnique).toHaveBeenCalledWith({ where: { id: 't300' } });
    expect(tripPlan.delete).toHaveBeenCalledWith({ where: { id: 't300' } });
    expect(out).toEqual({ id: 't300' });
  });

  it('remove: throws when not found', async () => {
    tripPlan.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove('nope')).rejects.toBeDefined();
  });

  /* -----------------------------
   * requestTripPlan
   * ----------------------------- */

  it('requestTripPlan: suggestions when no area (with lat/lon)', async () => {
    const suggestResult: SuggestItem[] = [
      { place: { name: 'Ella', lat: 6.86, lon: 81.04 }, score: 0.9 },
    ];
    suggest.suggest.mockResolvedValueOnce(
      suggestResult as unknown as Awaited<
        ReturnType<PlacesSuggestService['suggest']>
      >,
    );

    const out = await service.requestTripPlan({ lat: 6.9, lon: 81.0 });

    expect(suggest.suggest).toHaveBeenCalledTimes(1);
    expect(out.code).toBe(200);
    expect(out.data).not.toBeNull();
    if (out.data) expect(out.data.mode).toBe('suggestions');
  });

  it('requestTripPlan: geocodes when lat/lon missing; one-day forecast if date given', async () => {
    const geocodeHit: GeocodeHit = { lat: 6.86, lon: 81.04 };
    geocode.geocodeLK.mockResolvedValueOnce(
      geocodeHit as unknown as Awaited<ReturnType<GeocodeService['geocodeLK']>>,
    );

    // nearby empty → force geocode path for the area
    suggest.suggest.mockResolvedValueOnce(
      [] as unknown as Awaited<ReturnType<PlacesSuggestService['suggest']>>,
    );

    const fc: ForecastEnvelope = {
      data: { daily: [{ t2m: 28, precip_hi: 5 }] },
    };
    forecast.forecastByCoords.mockResolvedValueOnce(
      fc as unknown as Awaited<ReturnType<ForecastService['forecastByCoords']>>,
    );

    const out = await service.requestTripPlan({
      place: 'Ella',
      area: 'Ella',
      date: '2024-08-10',
    });

    expect(geocode.geocodeLK).toHaveBeenCalledWith('Ella');
    expect(out.code).toBe(200);
    expect(out.data).not.toBeNull();
    if (out.data) {
      expect(out.data.mode).toBe('forecast-one');
      expect(out.data.date).toBe('2024-08-10');
    }
  });

  it('requestTripPlan: 30-day forecast when area given without date', async () => {
    // nearby contains the area → take its coords
    const nearby: SuggestItem[] = [
      { place: { name: 'Mirissa', lat: 5.95, lon: 80.47 } },
    ];
    suggest.suggest.mockResolvedValueOnce(
      nearby as unknown as Awaited<ReturnType<PlacesSuggestService['suggest']>>,
    );

    const fc: ForecastEnvelope = {
      data: {
        daily: [{ t2m: 29, precip: 2 }],
        forecast_window: { start: '2024-08-01', end: '2024-08-30' },
      },
    };
    forecast.forecastByCoords.mockResolvedValueOnce(
      fc as unknown as Awaited<ReturnType<ForecastService['forecastByCoords']>>,
    );

    const out = await service.requestTripPlan({
      lat: 6.0,
      lon: 80.5,
      area: 'Mirissa',
    });

    expect(out.code).toBe(200);
    expect(out.data).not.toBeNull();
    if (out.data) {
      expect(out.data.mode).toBe('forecast-30');
      expect(out.data.selectedArea?.name).toBe('Mirissa');
    }
  });
});
