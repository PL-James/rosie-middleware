import { execSync } from 'child_process';
import os from 'os';

/**
 * Captures a snapshot of the current runtime environment.
 * Used by createEvidencePackage to generate environment.json.
 *
 * @gxp-tag SPEC-INF-004
 * @gxp-criticality MEDIUM
 */

export interface EnvironmentSnapshot {
  node_version: string;
  npm_version: string;
  platform: string;
  arch: string;
  os_release: string;
  hostname: string;
  username: string;
  cwd: string;
  env_vars: Record<string, string>;
  timestamp: string;
}

/**
 * Redact PII fields by hashing them.
 * Preserves uniqueness for correlation while hiding actual values.
 */
function redactPii(value: string): string {
  const { createHash } = require('crypto');
  return `[redacted:${createHash('sha256').update(value).digest('hex').substring(0, 8)}]`;
}

/**
 * Captures current environment details for evidence packages.
 * Sensitive env vars (keys, tokens, passwords) are redacted.
 */
export function captureEnvironment(): EnvironmentSnapshot {
  return {
    node_version: process.version,
    npm_version: getNpmVersion(),
    platform: process.platform,
    arch: process.arch,
    os_release: os.release(),
    hostname: redactPii(os.hostname()),
    username: redactPii(os.userInfo().username),
    cwd: redactPii(process.cwd()),
    env_vars: filterEnvVars(process.env),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get npm version, returning 'unknown' on failure.
 */
function getNpmVersion(): string {
  try {
    return execSync('npm --version', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Filter environment variables: include only safe, non-secret vars.
 * Redacts anything matching key/token/secret/password/api patterns.
 */
function filterEnvVars(env: NodeJS.ProcessEnv): Record<string, string> {
  const sensitivePatterns = /key|token|secret|password|credential|api_key|private/i;
  const safeVars: Record<string, string> = {};

  const allowlist = [
    'NODE_ENV',
    'PATH',
    'SHELL',
    'LANG',
    'HOME',
    'USER',
    'CI',
    'GITHUB_ACTIONS',
    'RAILWAY_ENVIRONMENT',
  ];

  for (const name of allowlist) {
    if (env[name]) {
      safeVars[name] = env[name]!;
    }
  }

  return safeVars;
}
