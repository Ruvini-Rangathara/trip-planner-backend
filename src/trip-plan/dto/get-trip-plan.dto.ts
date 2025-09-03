import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginatePropsMixin } from 'src/common/types/paginate-props';
import { PaginatedResponse } from 'src/common/types/paginated-response';
import { TripPlanDto } from './trip-plan.dto';

/** GET ALL */
export class GetAllTripPlanRequestDto extends PaginatePropsMixin(class {}) {
  @ApiProperty({ description: 'Owner user id' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    enum: ['old', 'future', 'all'],
    default: 'all',
    description: 'Filter by time window: past trips, future trips, or all',
  })
  @IsOptional()
  @IsIn(['old', 'future', 'all'])
  when?: 'old' | 'future' | 'all';
}

export class GetAllTripPlanResponseDto extends PaginatedResponse(TripPlanDto) {}

export class GetOneTripPlanRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id!: string;
}

export class GetOneTripPlanResponseDto extends TripPlanDto {}
