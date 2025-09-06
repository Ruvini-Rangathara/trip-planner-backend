import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { UserDto } from './user.dto';
import { PaginatedResponse } from 'src/common/types/paginated-response';

export class getOneUserDto {
  @ApiProperty()
  @IsString()
  id: string;
}

export class getAllUserRequestDto {
  @ApiProperty()
  @IsBoolean()
  isDeleted?: boolean;
}

export class getAllUserResponseDto extends PaginatedResponse(UserDto) {}

export class getUserByEmailDto {
  @ApiProperty()
  @IsString()
  email: string;
}
