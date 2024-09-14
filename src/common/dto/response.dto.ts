export interface BaseResponseDto {
  message: string;
}

/**
 * Non-paginated success response
 */
export interface SuccessResponseDto<T> extends BaseResponseDto {
  result: 'success';
  data: T;
}

export interface BasePaginationResponseMetaDto {
  limit: number;
}

export interface PagePaginationResponseMetaDto
  extends BasePaginationResponseMetaDto {
  page: number;
  totalItems: number;
  totalPages: number;
}

export interface OffsetPaginationResponseMetaDto
  extends BasePaginationResponseMetaDto {
  offset: number;
  totalItems: number;
}

export interface CursorPaginationResponseMetaDto
  extends BasePaginationResponseMetaDto {
  cursor: string | null; // null for the first page
  nextCursor: string | null; // null for the last page
}

export interface SuccessPaginationResponseDto<
  T,
  M extends BasePaginationResponseMetaDto,
> extends SuccessResponseDto<T[]> {
  meta: M;
}

/**
 * Page pagination success response
 */
export type SuccessPagePaginationResponseDto<T> = SuccessPaginationResponseDto<
  T,
  PagePaginationResponseMetaDto
>;

/**
 * Offset pagination success response
 */
export type SuccessOffsetPaginationResponseDto<T> =
  SuccessPaginationResponseDto<T, OffsetPaginationResponseMetaDto>;

/**
 * Cursor pagination success response
 */
export type SuccessCursorPaginationResponseDto<T> =
  SuccessPaginationResponseDto<T, CursorPaginationResponseMetaDto>;

export interface ErrorFieldDto {
  field: string;
  message: string;
}

/**
 * Error response
 */
export interface ErrorResponseDto extends BaseResponseDto {
  result: 'error';
  errorFields: ErrorFieldDto[] | null;
}

export class ResponseFactory {
  static createSuccessResponse(message: string): SuccessResponseDto<null> {
    return {
      result: 'success',
      message: message,
      data: null,
    };
  }

  static createSuccessResponseWithData<T>(
    message: string,
    data: T,
  ): SuccessResponseDto<T> {
    return {
      result: 'success',
      message,
      data,
    };
  }

  static createSuccessPagePaginatedResponse<T>(
    message: string,
    data: T[],
    meta: PagePaginationResponseMetaDto,
  ): SuccessPagePaginationResponseDto<T> {
    return {
      result: 'success',
      message,
      data,
      meta,
    };
  }

  static createSuccessOffsetPaginatedResponse<T>(
    message: string,
    data: T[],
    meta: OffsetPaginationResponseMetaDto,
  ): SuccessOffsetPaginationResponseDto<T> {
    return {
      result: 'success',
      message,
      data,
      meta,
    };
  }

  static createSuccessCursorPaginatedResponse<T>(
    message: string,
    data: T[],
    meta: CursorPaginationResponseMetaDto,
  ): SuccessCursorPaginationResponseDto<T> {
    return {
      result: 'success',
      message,
      data,
      meta,
    };
  }

  static createErrorResponse(
    message: string,
    errorFields: ErrorFieldDto[] | null = null,
  ): ErrorResponseDto {
    return { result: 'error', message, errorFields };
  }
}
