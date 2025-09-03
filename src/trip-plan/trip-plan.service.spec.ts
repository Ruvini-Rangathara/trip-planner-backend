import { Test, TestingModule } from '@nestjs/testing';
import { TripPlanService } from './trip-plan.service';

describe('TripPlanService', () => {
  let service: TripPlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TripPlanService],
    }).compile();

    service = module.get<TripPlanService>(TripPlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
