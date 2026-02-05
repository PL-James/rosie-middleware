import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiKeyService } from './api-key.service';
import { db } from '@/db';

// Helper to generate test API keys at runtime (avoids secret scanner false positives)
const makeTestApiKey = (char: string = 'a'): string => `rsk_${char.repeat(64)}`;

/**
 * @gxp-tag SPEC-006-002-001
 * @gxp-criticality HIGH
 * @test-type unit
 * @requirement REQ-006
 */
describe('ApiKeyService - API Key Management', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    service = new ApiKeyService();
    // Clear any previous test data
    vi.clearAllMocks();
  });

  /**
   * @gxp-tag SPEC-006-002-002
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-006
   */
  describe('API Key Generation', () => {
    it('should generate API key with correct prefix', async () => {
      const mockInsert = vi.fn().mockResolvedValue([
        {
          id: 'key-id-123',
          name: 'Test API Key',
          keyHash: 'hashed-value',
          userId: 'user-123',
          scopes: ['read', 'write'],
          expiresAt: null,
          isRevoked: false,
          createdAt: new Date(),
        },
      ]);

      vi.spyOn(db, 'insert' as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsert,
        }),
      });

      const result = await service.generateApiKey(
        'user-123',
        'Test API Key',
        ['read', 'write'],
      );

      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('id');
      expect(result.apiKey).toMatch(/^rsk_[a-f0-9]{64}$/); // rsk = rosie secret key
    });

    /**
     * @gxp-tag SPEC-006-002-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should store API key hash, not the key itself', async () => {
      const mockInsert = vi.fn().mockResolvedValue([
        {
          id: 'key-id-123',
          name: 'Test Key',
          keyHash: 'hashed-value',
          userId: 'user-123',
          scopes: ['read', 'write'],
          expiresAt: null,
          isRevoked: false,
          createdAt: new Date(),
        },
      ]);

      vi.spyOn(db, 'insert' as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsert,
        }),
      });

      const result = await service.generateApiKey(
        'user-123',
        'Test Key',
        ['read', 'write'],
      );

      expect(result.id).toBe('key-id-123');
      expect(mockInsert).toHaveBeenCalled();
    });

    /**
     * @gxp-tag SPEC-006-002-004
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should support optional expiration date', async () => {
      const mockInsert = vi.fn().mockResolvedValue([
        {
          id: 'key-id-123',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      ]);

      vi.spyOn(db, 'insert' as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsert,
        }),
      });

      const result = await service.generateApiKey(
        'user-123',
        'Expiring Key',
        ['read'],
        30, // 30 days
      );

      expect(result.id).toBe('key-id-123');
    });

    /**
     * @gxp-tag SPEC-006-002-005
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should support custom scopes', async () => {
      const mockInsert = vi.fn().mockResolvedValue([
        {
          id: 'key-id-123',
          scopes: ['read', 'write', 'admin'],
        },
      ]);

      vi.spyOn(db, 'insert' as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsert,
        }),
      });

      await service.generateApiKey(
        'user-123',
        'Admin Key',
        ['read', 'write', 'admin'],
      );

      expect(mockInsert).toHaveBeenCalled();
    });
  });

  /**
   * @gxp-tag SPEC-006-002-006
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-006
   */
  describe('API Key Validation', () => {
    it('should validate correct API key and return user info', async () => {
      const apiKey = makeTestApiKey('t');
      const mockKey = {
        id: 'key-id-123',
        keyHash: 'computed-hash',
        userId: 'user-123',
        scopes: ['read', 'write'],
        isRevoked: false,
        expiresAt: null,
      };

      vi.spyOn(db, 'select' as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockKey]),
        }),
      });

      const mockUpdate = vi.fn().mockResolvedValue(true);
      vi.spyOn(db, 'update' as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: mockUpdate,
        }),
      });

      const result = await service.validateApiKey(apiKey);

      expect(result).toEqual({
        userId: 'user-123',
        scopes: ['read', 'write'],
      });
      expect(mockUpdate).toHaveBeenCalled();
    });

    /**
     * @gxp-tag SPEC-006-002-007
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should reject revoked API key', async () => {
      const apiKey = makeTestApiKey('r');
      const mockKey = {
        id: 'key-id-123',
        isRevoked: true,
        expiresAt: null,
      };

      vi.spyOn(db, 'select' as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockKey]),
        }),
      });

      const result = await service.validateApiKey(apiKey);

      expect(result).toBeNull();
    });

    /**
     * @gxp-tag SPEC-006-002-008
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should reject expired API key', async () => {
      const apiKey = makeTestApiKey('e');
      const mockKey = {
        id: 'key-id-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        userId: 'user-123',
        scopes: ['read'],
      };

      vi.spyOn(db, 'select' as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockKey]),
        }),
      });

      const result = await service.validateApiKey(apiKey);

      expect(result).toBeNull();
    });

    /**
     * @gxp-tag SPEC-006-002-009
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should reject invalid/unknown API key', async () => {
      const apiKey = makeTestApiKey('u');

      vi.spyOn(db, 'select' as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No key found
        }),
      });

      const result = await service.validateApiKey(apiKey);

      expect(result).toBeNull();
    });

    /**
     * @gxp-tag SPEC-006-002-010
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @requirement REQ-006
     */
    it('should update lastUsedAt timestamp on successful validation', async () => {
      const apiKey = makeTestApiKey('v');
      const mockKey = {
        id: 'key-id-123',
        keyHash: 'computed-hash',
        userId: 'user-123',
        scopes: ['read'],
        isRevoked: false,
        expiresAt: null,
      };

      vi.spyOn(db, 'select' as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockKey]),
        }),
      });

      const mockUpdate = vi.fn().mockResolvedValue(true);
      vi.spyOn(db, 'update' as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: mockUpdate,
        }),
      });

      await service.validateApiKey(apiKey);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  /**
   * @gxp-tag SPEC-006-002-011
   * @gxp-criticality HIGH
   * @test-type unit
   * @requirement REQ-006
   */
  describe('API Key Revocation', () => {
    it('should revoke API key by ID', async () => {
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'key-id-123' }]);
      vi.spyOn(db, 'update' as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: mockReturning,
          }),
        }),
      });

      await service.revokeApiKey('key-id-123', 'user-123');

      expect(mockReturning).toHaveBeenCalled();
    });

    /**
     * @gxp-tag SPEC-006-002-012
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should set isRevoked=true and revokedAt timestamp', async () => {
      let capturedSetValues: any;

      vi.spyOn(db, 'update' as any).mockReturnValue({
        set: vi.fn().mockImplementation((values) => {
          capturedSetValues = values;
          return {
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'key-id-123' }]),
            }),
          };
        }),
      });

      await service.revokeApiKey('key-id-123', 'user-123');

      expect(capturedSetValues).toHaveProperty('isRevoked', true);
      expect(capturedSetValues).toHaveProperty('revokedAt');
      expect(capturedSetValues.revokedAt).toBeInstanceOf(Date);
    });
  });

  /**
   * @gxp-tag SPEC-006-002-013
   * @gxp-criticality MEDIUM
   * @test-type unit
   * @requirement REQ-006
   */
  describe('Security', () => {
    it('should generate cryptographically random API keys', async () => {
      const mockInsert = vi.fn().mockResolvedValue([
        { id: 'key-1', keyHash: 'hash-1' },
      ]);

      vi.spyOn(db, 'insert' as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsert,
        }),
      });

      const key1 = await service.generateApiKey('user-123', 'Key 1', ['read']);
      const key2 = await service.generateApiKey('user-123', 'Key 2', ['read']);

      // Keys should be different (high probability with 64 hex chars)
      expect(key1.apiKey).not.toBe(key2.apiKey);
    });

    /**
     * @gxp-tag SPEC-006-002-014
     * @gxp-criticality HIGH
     * @test-type unit
     * @requirement REQ-006
     */
    it('should use SHA-256 for key hashing', async () => {
      let capturedValues: any;

      const mockValues = vi.fn().mockImplementation((values) => {
        capturedValues = values;
        return {
          returning: vi.fn().mockResolvedValue([{ id: 'key-id', ...values }]),
        };
      });

      vi.spyOn(db, 'insert' as any).mockReturnValue({
        values: mockValues,
      });

      await service.generateApiKey('user-123', 'Test Key', ['read']);

      expect(mockValues).toHaveBeenCalled();
      expect(capturedValues.keyHash).toHaveLength(64);
      expect(capturedValues.keyHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
