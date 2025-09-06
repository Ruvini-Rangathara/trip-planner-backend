import { HttpStatus } from '@nestjs/common';

export const AreaException = {
  AREA_NOT_FOUND: {
    code: 63401,
    status: HttpStatus.NOT_FOUND,
    message: 'Area not found',
  },
} as const;
