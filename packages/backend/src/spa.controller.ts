import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

/**
 * SPA Fallback Controller
 *
 * Serves index.html for client-side routes (React Router) that don't match
 * any API controller or static asset. Registered on AppModule so it evaluates
 * AFTER all imported module controllers — API routes take priority.
 *
 * Static assets (/assets/*) are served by @nestjs/serve-static middleware
 * before this controller is reached. API routes (/api/*) are matched by
 * their respective controllers first.
 */
@Controller()
export class SpaController {
  private readonly indexPath = join(
    __dirname,
    '../..',
    'frontend',
    'dist',
    'index.html',
  );

  @Get('*')
  serveSpa(@Res() res: Response): void {
    res.sendFile(this.indexPath);
  }
}
