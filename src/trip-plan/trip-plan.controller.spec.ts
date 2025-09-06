/* eslint-disable @typescript-eslint/unbound-method */
// src/trip-plan/trip-plan.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { TripPlanController } from './trip-plan.controller';
import { TripPlanService } from './trip-plan.service';

import {
  GetAllTripPlanRequestDto,
  GetAllTripPlanResponseDto,
  GetOneTripPlanRequestDto,
  GetOneTripPlanResponseDto,
} from './dto/get-trip-plan.dto';
import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import { DeleteTripPlanDto } from './dto/delete-trip-plan.dto';
import { TripPlanDto } from './dto/trip-plan.dto';

/* ---------- small helpers ---------- */

type TripAreaOut = {
  id: string;
  area: string;
  latitude: number;
  longitude: number;
};
type TripPlanOut = {
  id: string;
  userId: string;
  title: string;
  date: Date;
  status?: string;
  areas?: TripAreaOut[];
};

function makeTrip(p: Partial<TripPlanOut> = {}): TripPlanOut {
  return {
    id: p.id ?? 't-1',
    userId: p.userId ?? 'u-1',
    title: p.title ?? 'Trip',
    date: p.date ?? new Date('2024-08-01T00:00:00Z'),
    status: p.status ?? 'PLANNED',
    areas: p.areas ?? [
      { id: 'a-1', area: 'Ella', latitude: 6.86, longitude: 81.04 },
    ],
  };
}

/** Construct TripPlanDto without ts-comments */
function makeTripDto(p: Partial<TripPlanOut> = {}): TripPlanDto {
  const base = makeTrip(p);
  const Ctor = TripPlanDto as unknown as new (arg: unknown) => TripPlanDto;
  return new Ctor(base);
}

function makeGetAllDto(
  items: TripPlanDto[],
  count: number,
): GetAllTripPlanResponseDto {
  const Ctor = GetAllTripPlanResponseDto as unknown as new (
    count: number,
    items: TripPlanDto[],
  ) => GetAllTripPlanResponseDto;
  return new Ctor(count, items);
}

function makeGetOneDto(obj: TripPlanOut): GetOneTripPlanResponseDto {
  const Ctor = GetOneTripPlanResponseDto as unknown as new (
    arg: unknown,
  ) => GetOneTripPlanResponseDto;
  return new Ctor(obj);
}

/** Fully-typed mocked TripPlanService */
function makeServiceMock(): jest.Mocked<TripPlanService> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getOne: jest.fn(),
    getAll: jest.fn(),
    requestTripPlan: jest.fn(),
  } as unknown as jest.Mocked<TripPlanService>;
}

describe('TripPlanController', () => {
  let controller: TripPlanController;
  let svc: jest.Mocked<TripPlanService>;

  beforeEach(async () => {
    svc = makeServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripPlanController],
      providers: [{ provide: TripPlanService, useValue: svc }],
    }).compile();

    controller = module.get(TripPlanController);
  });

  it('create → wraps TripPlanDto in envelope', async () => {
    const input: CreateTripPlanDto = {
      userId: 'u-1',
      title: 'A',
      date: '2024-08-10',
      areas: [{ area: 'Ella', lat: 6.86, lng: 81.04 }],
    };
    const trip = makeTripDto({ id: 't-9', title: 'A' });
    svc.create.mockResolvedValueOnce(trip);

    const out = await controller.create(input);
    expect(svc.create).toHaveBeenCalledWith(input);
    expect(out.code).toBe(200);
    expect(out.data).toBe(trip);
  });

  it('update → wraps TripPlanDto', async () => {
    const input: UpdateTripPlanDto = {
      id: 't-1',
      title: 'New',
      areas: [{ area: 'Ella', lat: 6.86, lng: 81.04 }],
    };
    const trip = makeTripDto({ id: 't-1', title: 'New' });
    svc.update.mockResolvedValueOnce(trip);

    const out = await controller.update(input);
    expect(svc.update).toHaveBeenCalledWith(input);
    expect(out.data).toBe(trip);
  });

  it('delete → returns id envelope', async () => {
    const input: DeleteTripPlanDto = { id: 't-2' };
    svc.remove.mockResolvedValueOnce({ id: 't-2' });

    const out = await controller.remove(input);
    expect(svc.remove).toHaveBeenCalledWith('t-2');
    expect(out.data).toEqual({ id: 't-2' });
  });

  it('get-one → wraps GetOneTripPlanResponseDto', async () => {
    const raw = makeTrip({ id: 't-3' });
    const dto = makeGetOneDto(raw);
    const input: GetOneTripPlanRequestDto = { id: 't-3' };
    svc.getOne.mockResolvedValueOnce(dto);

    const out = await controller.getOne(input);
    expect(svc.getOne).toHaveBeenCalledWith({ id: 't-3' });
    expect(out.data).toBe(dto);
  });

  it('get-all → wraps GetAllTripPlanResponseDto', async () => {
    const input: GetAllTripPlanRequestDto = {
      userId: 'u-1',
      when: 'all',
      page: 1,
      size: 10,
    } as GetAllTripPlanRequestDto;

    const items = [makeTripDto({ id: 't-1' }), makeTripDto({ id: 't-2' })];
    const dto = makeGetAllDto(items, 2);
    svc.getAll.mockResolvedValueOnce(dto);

    const out = await controller.getAll(input);
    expect(svc.getAll).toHaveBeenCalledWith(input);
    expect(out.data).toBe(dto);
  });

  it('request → returns service envelope as-is (suggestions mode)', async () => {
    const body = { lat: 6.9, lon: 81.0 };

    type SvcReturn = Awaited<ReturnType<TripPlanService['requestTripPlan']>>;
    const payload: SvcReturn = {
      code: 200,
      message: 'OK',
      data: {
        mode: 'suggestions',
        center: { lat: 6.9, lon: 81.0 },
        suggestions: [],
        hint: 'demo',
      },
    };

    svc.requestTripPlan.mockResolvedValueOnce(payload);
    const out = await controller.request(body);

    expect(svc.requestTripPlan).toHaveBeenCalledWith(body);
    expect(out).toEqual(payload);
  });
});
