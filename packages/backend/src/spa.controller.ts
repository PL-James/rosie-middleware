import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

/**
 * SPA Fallback Controller
 * Handles client-side routing by serving index.html for all non-API routes
 * This allows React Router to handle navigation on page refresh
 */
@Controller()
export class SpaController {
  @Get('*')
  serveSpa(@Res() res: Response): void {
    // Serve index.html for all routes that don't match API endpoints
    // API endpoints are excluded via @nestjs/serve-static config
    res.sendFile(join(__dirname, '../..', 'frontend', 'dist', 'index.html'));
  }
}
