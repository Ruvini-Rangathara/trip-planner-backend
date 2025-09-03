import { Test, TestingModule } from '@nestjs/testing';
import { TripPlanController } from './trip-plan.controller';
import { TripPlanService } from './trip-plan.service';

describe('TripPlanController', () => {
  let controller: TripPlanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripPlanController],
      providers: [TripPlanService],
    }).compile();

    controller = module.get<TripPlanController>(TripPlanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
