export type CustomErrorContent = {
  message: string;
  context?: { [key: string]: any };
};

export abstract class CustomError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errors: CustomErrorContent[];
  abstract readonly logging: boolean;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}


export class BadRequestError extends CustomError {
  private static readonly statusCode = 400;
  readonly logging = true;

  constructor(
    message: string,
    private readonly context?: { [key: string]: any }
  ) {
    super(message);
  }

  get errors(): CustomErrorContent[] {
    return [{ message: this.message, context: this.context }];
  }

  get statusCode(): number {
    return BadRequestError.statusCode;
  }

  getLogging(): boolean {
    return this.logging;
  }
}


export class NotFoundError extends CustomError {
  errors: CustomErrorContent[];
  logging: boolean;
  statusCode = 404;

  constructor(message: string) {
    super(message);
  }
}

export class InternalServerError extends CustomError {
  errors: CustomErrorContent[];
  logging: boolean;
  statusCode = 500;

  constructor(message: string) {
    super(message);
  }
}
