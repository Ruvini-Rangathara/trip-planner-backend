import { HttpStatus } from '@nestjs/common';

export const AlertException = {
  ALERT_NOT_FOUND: {
    code: 63501,
    status: HttpStatus.NOT_FOUND,
    message: 'Alert not found',
  },
} as const;
