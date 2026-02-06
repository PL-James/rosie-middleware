import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Computes a deterministic SHA-256 hash of all files in a directory tree.
 * Files are sorted by relative path for reproducibility.
 *
 * @param srcDir - The root directory to hash
 * @returns 64-character hex SHA-256 hash
 */
export function computeSrcTreeHash(srcDir: string): string {
  const files = collectFiles(srcDir);
  files.sort(); // Sort by relative path for determinism

  const hash = createHash('sha256');

  for (const relPath of files) {
    const absPath = path.join(srcDir, relPath);
    const content = readFileSync(absPath);
    // Include the relative path in the hash to detect renames
    // Null byte delimiter prevents path/content boundary ambiguity
    hash.update(relPath);
    hash.update('\0');
    hash.update(content);
  }

  return hash.digest('hex');
}

/**
 * Recursively collect all file paths relative to rootDir
 */
function collectFiles(rootDir: string, prefix: string = ''): string[] {
  const files: string[] = [];
  const entries = readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      files.push(...collectFiles(path.join(rootDir, entry.name), relPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }

  return files;
}
