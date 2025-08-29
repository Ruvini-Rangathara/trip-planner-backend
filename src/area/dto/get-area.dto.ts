import { PaginatePropsMixin } from 'src/common/types/paginate-props';
import { PaginatedResponse } from 'src/common/types/paginated-response';
import { AreaDto } from './area.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class GetAllAreaRequestDto extends PaginatePropsMixin(class {}) {}

export class GetAllAreaResponseDto extends PaginatedResponse(AreaDto) {}

export class GetOneAreaRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  id: string;
}

export class GetOneAreaResponseDto extends AreaDto {}
