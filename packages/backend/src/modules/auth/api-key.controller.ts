import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotImplementedException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

/**
 * API Key Controller
 *
 * Manages API key lifecycle for external integrations.
 * Requires admin role to generate/revoke API keys.
 */
@Controller('api/v1/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Generate a new API key
   *
   * POST /api/v1/api-keys
   * Body: { name, scopes, expiresInDays? }
   */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      scopes: string[];
      expiresInDays?: number;
    },
  ) {
    const userId = req.user.id;

    const result = await this.apiKeyService.generateApiKey(
      userId,
      body.name,
      body.scopes,
      body.expiresInDays,
    );

    return {
      id: result.id,
      apiKey: result.apiKey,
      message:
        'API key generated successfully. Store it securely - it will not be shown again.',
    };
  }

  /**
   * List API keys for the current user
   *
   * GET /api/v1/api-keys
   * Returns list of API keys (without the actual key values)
   */
  @Get()
  @Roles('admin')
  async listApiKeys() {
    throw new NotImplementedException(
      'List API keys endpoint is not implemented yet',
    );
  }

  /**
   * Revoke an API key
   *
   * DELETE /api/v1/api-keys/:id
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(@Param('id') keyId: string, @Request() req: any) {
    const userId = req.user.id;

    await this.apiKeyService.revokeApiKey(keyId, userId);

    return {
      message: 'API key revoked successfully',
    };
  }
}
