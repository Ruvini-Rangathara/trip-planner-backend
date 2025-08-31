import { PaginatePropsMixin } from 'src/common/types/paginate-props';
import { PaginatedResponse } from 'src/common/types/paginated-response';
import { AlertDto } from './alert.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAllAlertRequestDto extends PaginatePropsMixin(class {}) {}

export class GetAllAlertResponseDto extends PaginatedResponse(AlertDto) {}

export class GetOneAlertRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class GetOneAlertResponseDto extends AlertDto {}
