import {
  CursorPaginationRequestQuery,
  OffsetPaginationRequestQuery,
  PagePaginationRequestQuery,
} from '../dto/request.dto';
import {
  createParamDecorator,
  ExecutionContext,
  ParseUUIDPipe,
  PipeTransform,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Gets page based pagination parameters from the request query.
 *
 * if either page or limit is not provided, it will use the default values
 */
export const PagePagination = createParamDecorator(
  (
    data:
      | {
          defaultPage?: number;
          defaultLimit?: number;
          defaultMaxLimit?: number;
        }
      | undefined,
    ctx: ExecutionContext,
  ): PagePaginationRequestQuery => {
    const defaultPage = data?.defaultPage || 1;
    const defaultLimit = data?.defaultLimit || 10;
    const defaultMaxLimit = data?.defaultMaxLimit || 100;
    const req = ctx.switchToHttp().getRequest<Request>();

    let page = parseInt(req.query['page'] as string) || defaultPage;
    if (isNaN(page) || page < 1) {
      page = defaultPage;
    }

    let limit = parseInt(req.query['limit'] as string) || defaultLimit;
    if (isNaN(limit) || limit < 1) {
      limit = defaultLimit;
    } else if (limit > defaultMaxLimit) {
      limit = defaultMaxLimit;
    }

    return { page, limit };
  },
);

/**
 * Gets offset based pagination parameters from the request query.
 *
 * if either offset or limit is not provided, it will use the default values
 */
export const OffsetPagination = createParamDecorator(
  (
    data:
      | {
          defaultOffset?: number;
          defaultLimit?: number;
          defaultMaxLimit?: number;
        }
      | undefined,
    ctx: ExecutionContext,
  ): OffsetPaginationRequestQuery => {
    const defaultOffset = data?.defaultOffset || 0;
    const defaultLimit = data?.defaultLimit || 10;
    const defaultMaxLimit = data?.defaultMaxLimit || 100;
    const req = ctx.switchToHttp().getRequest<Request>();

    let offset = parseInt(req.query['offset'] as string) || defaultOffset;
    if (isNaN(offset) || offset < 0) {
      offset = defaultOffset;
    }

    let limit = parseInt(req.query['limit'] as string) || defaultLimit;
    if (isNaN(limit) || limit < 1) {
      limit = defaultLimit;
    } else if (limit > defaultMaxLimit) {
      limit = defaultMaxLimit;
    }

    return { offset, limit };
  },
);

/**
 * Cursor based pagination parameters from the request query.
 *
 */
export const CursorPagination = createParamDecorator(
  async (
    data:
      | {
          defaultLimit?: number;
          maxLimit?: number;
          cursorPipe?: PipeTransform<string>;
        }
      | undefined,
    ctx: ExecutionContext,
  ): Promise<CursorPaginationRequestQuery> => {
    const defaultLimit = data?.defaultLimit || 10;
    const maxLimit = data?.maxLimit || 100;
    const cursorPipe = data?.cursorPipe || new ParseUUIDPipe({ version: '4' });
    const req = ctx.switchToHttp().getRequest<Request>();

    // Parse and validate limit
    let limit = parseInt(req.query['limit'] as string) || defaultLimit;
    if (isNaN(limit) || limit < 1) {
      limit = defaultLimit;
    } else if (limit > maxLimit) {
      limit = maxLimit;
    }

    // Validate cursor
    let cursor = (req.query['cursor'] as string | null) || null;
    if (cursor) {
      try {
        cursor = await cursorPipe.transform(cursor, {
          type: 'query',
          metatype: String,
          data: 'cursor',
        });
      } catch (error) {
        throw error;
      }
    }

    return { cursor, limit };
  },
);
