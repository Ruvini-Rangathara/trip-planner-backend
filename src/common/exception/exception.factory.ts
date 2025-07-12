import { HttpException, HttpStatus } from '@nestjs/common';
import { UserException } from './constants/user-exception.enum';

export type ErrorFormat = {
  code: number;
  status: HttpStatus;
  message: string;
  message_si?: string;
};

export class ExceptionFactory extends HttpException {
  public readonly code: number;
  private constructor(
    public readonly error: ErrorFormat,
    cause?: any,
  ) {
    super(
      {
        code: error.code,
        message: error.message,
      },
      error.status,
      { cause },
    );
    this.code = error.code;
  }
  static user(errorCode: keyof typeof UserException, cause?: any) {
    return new ExceptionFactory(UserException[errorCode], cause);
  }
}
