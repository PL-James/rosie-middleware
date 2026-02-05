import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * API Key Service
 *
 * Manages API key generation, validation, and revocation for external integrations.
 * API keys are prefixed with 'rsk_' (ROSIE Secret Key) and stored as SHA-256 hashes.
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  /**
   * Generate a new API key
   *
   * @param userId - User ID who owns this key
   * @param name - Human-readable name for the key
   * @param scopes - Permission scopes (e.g., ['read', 'write', 'admin'])
   * @param expiresInDays - Optional expiration in days
   * @returns Object with apiKey (shown once) and key ID
   */
  async generateApiKey(
    userId: string,
    name: string,
    scopes: string[],
    expiresInDays?: number,
  ): Promise<{ apiKey: string; id: string }> {
    // Generate cryptographically random API key
    // Format: rsk_<64 hex characters> (32 bytes = 64 hex)
    const apiKey = `rsk_${randomBytes(32).toString('hex')}`;

    // Hash the key with SHA-256 for storage
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    this.logger.log(
      `Generating API key for user ${userId}: ${name} (expires: ${expiresAt ? expiresAt.toISOString() : 'never'})`,
    );

    // Store hash (never store the actual key)
    const [created] = await db
      .insert(apiKeys)
      .values({
        name,
        keyHash,
        userId,
        scopes,
        expiresAt,
      })
      .returning();

    this.logger.log(`API key created with ID: ${created.id}`);

    return {
      apiKey, // Return plaintext key only once
      id: created.id,
    };
  }

  /**
   * Validate an API key
   *
   * @param apiKey - The plaintext API key to validate
   * @returns User info and scopes if valid, null if invalid/revoked/expired
   */
  async validateApiKey(
    apiKey: string,
  ): Promise<{ userId: string; scopes: string[] } | null> {
    // Hash the provided key
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Look up the key in the database
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash));

    if (!key) {
      this.logger.warn('API key not found');
      return null;
    }

    // Check if revoked
    if (key.isRevoked) {
      this.logger.warn(`API key ${key.id} is revoked`);
      return null;
    }

    // Check if expired
    if (key.expiresAt && new Date() > key.expiresAt) {
      this.logger.warn(`API key ${key.id} is expired`);
      return null;
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id));

    this.logger.log(`API key ${key.id} validated for user ${key.userId}`);

    return {
      userId: key.userId,
      scopes: key.scopes,
    };
  }

  /**
   * Revoke an API key
   *
   * @param keyId - The key ID to revoke
   * @param userId - The user ID (for authorization check)
   */
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    this.logger.log(`Revoking API key ${keyId} for user ${userId}`);

    await db
      .update(apiKeys)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyId));

    this.logger.log(`API key ${keyId} revoked successfully`);
  }
}
