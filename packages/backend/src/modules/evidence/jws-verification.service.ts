import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as jose from 'node-jose';
import {
  getJwsPublicKeys,
  getJwsVerificationConfig,
} from './jws-keystore.config';

export interface JwsVerificationResult {
  isValid: boolean;
  payload: any;
  header: any;
  error?: string;
}

@Injectable()
export class JwsVerificationService implements OnModuleInit {
  private readonly logger = new Logger(JwsVerificationService.name);
  private keystore: any;
  private config = getJwsVerificationConfig();
  private keystoreReady: Promise<void>;

  constructor() {
    // Initialize keystore promise
    this.keystoreReady = this.initializeKeystore();
  }

  /**
   * NestJS lifecycle hook - ensures keystore is ready before requests
   */
  async onModuleInit() {
    await this.keystoreReady;
  }

  /**
   * Initialize the keystore with signing keys from configuration
   */
  private async initializeKeystore() {
    try {
      this.keystore = jose.JWK.createKeyStore();

      // Load public keys from configuration
      const publicKeys = getJwsPublicKeys();

      for (const pemKey of publicKeys) {
        try {
          await this.keystore.add(pemKey, 'pem');
          this.logger.log('Public key added to keystore');
        } catch (error) {
          this.logger.error('Failed to add public key:', error.message);
        }
      }

      this.logger.log(
        `JWS keystore initialized with ${this.keystore.all().length} keys`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize keystore:', error);
      throw error;
    }
  }

  /**
   * Verify a JWS signature
   */
  async verifySignature(jwsString: string): Promise<JwsVerificationResult> {
    // Ensure keystore is initialized
    await this.keystoreReady;

    try {
      // Validate JWS structure
      const structureValidation = this.validateStructure(jwsString);
      if (!structureValidation.isValid) {
        return {
          isValid: false,
          payload: null,
          header: null,
          error: structureValidation.error,
        };
      }

      // Parse JWS
      const result = await jose.JWS.createVerify(this.keystore).verify(
        jwsString,
      );

      // Decode payload
      const payload = JSON.parse(result.payload.toString());

      return {
        isValid: true,
        payload,
        header: result.header,
      };
    } catch (error) {
      if (this.config.logFailures) {
        this.logger.warn(`JWS verification failed: ${error.message}`);
      }

      // Development mode fallback: accept unsigned JWS
      if (this.config.allowUnsignedInDev) {
        try {
          const parts = jwsString.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(
              Buffer.from(parts[1], 'base64url').toString(),
            );
            const header = JSON.parse(
              Buffer.from(parts[0], 'base64url').toString(),
            );

            this.logger.warn(
              'Accepting unsigned JWS (development mode) - payload decoded successfully',
            );

            return {
              isValid: false, // Mark as invalid but include payload
              payload,
              header,
              error: 'Signature verification failed (development mode fallback)',
            };
          }
        } catch (decodeError) {
          this.logger.error('Failed to decode JWS payload:', decodeError);
        }
      }

      return {
        isValid: false,
        payload: null,
        header: null,
        error: error.message,
      };
    }
  }

  /**
   * Batch verify multiple JWS strings
   */
  async batchVerify(jwsStrings: string[]): Promise<JwsVerificationResult[]> {
    const results = await Promise.all(
      jwsStrings.map((jws) => this.verifySignature(jws)),
    );

    const validCount = results.filter((r) => r.isValid).length;
    this.logger.log(
      `Batch verification: ${validCount}/${jwsStrings.length} valid signatures`,
    );

    return results;
  }

  /**
   * Validate JWS structure (format check)
   */
  validateStructure(jwsString: string): { isValid: boolean; error?: string } {
    if (!jwsString || typeof jwsString !== 'string') {
      return {
        isValid: false,
        error: 'JWS must be a non-empty string',
      };
    }

    const parts = jwsString.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        error: 'JWS must have exactly 3 parts (header.payload.signature)',
      };
    }

    // Validate base64url encoding
    try {
      Buffer.from(parts[0], 'base64url');
      Buffer.from(parts[1], 'base64url');
      Buffer.from(parts[2], 'base64url');
    } catch (_error) {
      return {
        isValid: false,
        error: 'JWS parts must be valid base64url encoded strings',
      };
    }

    // Validate header structure
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      if (!header.alg) {
        return {
          isValid: false,
          error: 'JWS header must include "alg" field',
        };
      }
    } catch (_error) {
      return {
        isValid: false,
        error: 'JWS header must be valid JSON',
      };
    }

    // Validate payload structure
    try {
      JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    } catch (_error) {
      return {
        isValid: false,
        error: 'JWS payload must be valid JSON',
      };
    }

    return { isValid: true };
  }

  /**
   * Add a public key to the keystore (for future use)
   */
  async addPublicKey(jwkKey: any): Promise<void> {
    try {
      await this.keystore.add(jwkKey);
      this.logger.log('Public key added to keystore');
    } catch (error) {
      this.logger.error('Failed to add public key:', error);
      throw error;
    }
  }
}
