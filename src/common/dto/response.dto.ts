export interface BaseResponseDto {
  message: string;
}

export interface SuccessResponseDto<T> extends BaseResponseDto {
  data: T | undefined;
}

export interface MetaDto {
  page: number;
  limit: number;
  totalData: number;
  totalPage: number;
}

export interface SuccessPaginatedResponseDto<T>
  extends SuccessResponseDto<T[]> {
  meta: MetaDto;
}

export interface ErrorFieldDto {
  field: string;
  message: string;
}

export interface ErrorResponseDto extends BaseResponseDto {
  errorFields: ErrorFieldDto[] | undefined;
}

export class ResponseFactory {
  static createSuccessResponse<T>(
    message: string,
    data: T | undefined = undefined,
  ): SuccessResponseDto<T> {
    return { message, data };
  }

  static createSuccessPaginatedResponse<T>(
    message: string,
    data: T[],
    meta: MetaDto,
  ): SuccessPaginatedResponseDto<T> {
    return { message, data, meta };
  }

  static createErrorResponse(
    message: string,
    errorFields: ErrorFieldDto[] | undefined = undefined,
  ): ErrorResponseDto {
    return { message, errorFields };
  }
}
