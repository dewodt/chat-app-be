/**
 * ErrorField DTO
 *
 * @field field: string
 * @field message: string
 */
export class ErrorField {
  public field: string;

  public message: string;

  constructor(field: string, message: string) {
    this.field = field;
    this.message = message;
  }
}

/**
 * Error DTO
 *
 * error & statusCode is already handled by NestJS
 *
 * @field message: string
 * @field fields: Field[]
 */
export class ErrorDto {
  public message: string;

  public errorFields: ErrorField[] | undefined;

  constructor(
    message: string,
    errorFields: ErrorField[] | undefined = undefined,
  ) {
    this.message = message;
    this.errorFields = errorFields;
  }
}
