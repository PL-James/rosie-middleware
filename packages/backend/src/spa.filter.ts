import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { join } from 'path';

/**
 * SPA Fallback Filter
 *
 * Catches NotFoundException (404) and serves index.html for non-API routes,
 * enabling React Router to handle client-side navigation.
 *
 * This fires ONLY when no NestJS controller matched the request, avoiding
 * the route-ordering issues that a @Get('*') catch-all controller causes.
 *
 * - /api/* 404s → standard JSON error response
 * - All other 404s → index.html (SPA fallback for React Router)
 */
@Catch(NotFoundException)
export class SpaFilter implements ExceptionFilter {
  private readonly indexPath = join(
    __dirname,
    '../..',
    'frontend',
    'dist',
    'index.html',
  );

  catch(exception: NotFoundException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // API routes: return the standard NestJS 404 JSON
    if (req.path.startsWith('/api')) {
      const response = exception.getResponse();
      res
        .status(404)
        .json(typeof response === 'string' ? { message: response } : response);
      return;
    }

    // Everything else: serve index.html for React Router
    res.sendFile(this.indexPath);
  }
}
