import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Gets pagination parameters from the request query.
 *
 * if either page or limit is not provided, it will use the default values
 */
export const Pagination = createParamDecorator(
  (
    data: { defaultPage?: number; defaultLimit?: number } | undefined,
    ctx: ExecutionContext,
  ): PaginationParams => {
    const req = ctx.switchToHttp().getRequest<Request>();

    // Parse to integer
    let page = parseInt(req.query['page'] as string) || data?.defaultPage || 1;
    let limit =
      parseInt(req.query['limit'] as string) || data?.defaultLimit || 10;

    // Ensure page and limit are positive integers
    if (page < 1) {
      page = 1;
    }
    if (limit < 1) {
      limit = 10;
    }

    return { page, limit };
  },
);
