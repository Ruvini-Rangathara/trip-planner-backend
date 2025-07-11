import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, ValidateIf } from 'class-validator';

export interface GetRequestReturn<T> {
  count: number;
  data: T;
}

export class PaginatePropsType extends PaginatePropsMixin(class {}) {}

export function PaginatePropsMixin<T extends { new (...args: any[]): object }>(
  extend: T,
) {
  class _PaginatePropsType extends extend {
    [x: string]: any;

    @ApiPropertyOptional({
      type: Number,
      example: 1,
      description: 'The page number, Required if all is false',
    })
    @ValidateIf((o: { all?: boolean }) => Boolean(!o.all))
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({
      type: Number,
      example: 25,
      description: 'The page size, Required if all is false',
    })
    @ValidateIf((o: { all?: boolean }) => Boolean(!o.all))
    @IsNumber()
    pageSize?: number;

    @ApiPropertyOptional({
      type: Boolean,
      example: false,
      default: false,
      description: 'Whether to return all results',
    })
    @IsOptional()
    @IsBoolean()
    all?: boolean = false;
  }
  return _PaginatePropsType;
}
