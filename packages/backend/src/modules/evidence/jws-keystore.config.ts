/**
 * JWS Keystore Configuration
 *
 * This file provides configuration for JWS signature verification.
 *
 * SECURITY NOTES:
 * - In production, load keys from secure key management service (AWS KMS, HashiCorp Vault)
 * - Never commit private keys to version control
 * - Rotate keys regularly
 * - Use environment variables for production keys
 */

// Development keys (FOR TESTING ONLY - DO NOT USE IN PRODUCTION)
const DEVELOPMENT_PUBLIC_KEYS = [
  // Example RSA public key (2048-bit)
  // Generated with: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh
kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ
0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg
cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc
mwIDAQAB
-----END PUBLIC KEY-----`,
];

/**
 * Get JWS public keys for verification
 * Priority order:
 * 1. Environment variable (JWS_PUBLIC_KEYS as JSON array)
 * 2. Environment variable (JWS_PUBLIC_KEY_1, JWS_PUBLIC_KEY_2, etc.)
 * 3. Development keys (if NODE_ENV !== 'production')
 */
export function getJwsPublicKeys(): string[] {
  // Try JSON array from single env var
  if (process.env.JWS_PUBLIC_KEYS) {
    try {
      const keys = JSON.parse(process.env.JWS_PUBLIC_KEYS);
      if (Array.isArray(keys) && keys.length > 0) {
        console.log(`[JWS Keystore] Loaded ${keys.length} keys from JWS_PUBLIC_KEYS`);
        return keys;
      }
    } catch (error) {
      console.error('[JWS Keystore] Failed to parse JWS_PUBLIC_KEYS:', error.message);
    }
  }

  // Try numbered env vars (JWS_PUBLIC_KEY_1, JWS_PUBLIC_KEY_2, etc.)
  const numberedKeys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`JWS_PUBLIC_KEY_${i}`];
    if (key) {
      // Replace \n in env var with actual newlines
      numberedKeys.push(key.replace(/\\n/g, '\n'));
    }
  }
  if (numberedKeys.length > 0) {
    console.log(`[JWS Keystore] Loaded ${numberedKeys.length} keys from numbered env vars`);
    return numberedKeys;
  }

  // Development mode: use development keys
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[JWS Keystore] Using development keys (NOT for production use!)');
    return DEVELOPMENT_PUBLIC_KEYS;
  }

  // Production mode with no keys configured - error
  throw new Error(
    'JWS public keys not configured. Set JWS_PUBLIC_KEYS or JWS_PUBLIC_KEY_1 environment variable.'
  );
}

/**
 * Configuration options for JWS verification
 */
export interface JwsVerificationConfig {
  /**
   * Whether to allow unsigned JWS in development mode
   * Default: true for development, false for production
   */
  allowUnsignedInDev: boolean;

  /**
   * Whether to log verification failures
   * Default: true
   */
  logFailures: boolean;

  /**
   * Maximum age of JWS tokens to accept (in seconds)
   * Default: null (no age check)
   */
  maxAgeSeconds: number | null;
}

export function getJwsVerificationConfig(): JwsVerificationConfig {
  let maxAgeSeconds: number | null = null;

  if (process.env.JWS_MAX_AGE_SECONDS) {
    const parsed = parseInt(process.env.JWS_MAX_AGE_SECONDS, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      maxAgeSeconds = parsed;
    } else {
      console.warn(
        `Invalid JWS_MAX_AGE_SECONDS value: ${process.env.JWS_MAX_AGE_SECONDS}. Must be a non-negative number. Falling back to null.`
      );
    }
  }

  return {
    allowUnsignedInDev: process.env.NODE_ENV !== 'production',
    logFailures: process.env.JWS_LOG_FAILURES !== 'false',
    maxAgeSeconds,
  };
}
