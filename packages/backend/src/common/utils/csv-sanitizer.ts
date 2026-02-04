/**
 * CSV Sanitization Utility
 *
 * Prevents CSV injection attacks by sanitizing user-controlled data before export.
 * Implements formula neutralization and RFC 4180 escaping.
 *
 * @security CSV Injection Prevention (OWASP)
 * @compliance 21 CFR Part 11 - Data Integrity
 */

/**
 * Characters that trigger formula execution in Excel/Sheets
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a single CSV cell value to prevent CSV injection attacks.
 *
 * Formula injection occurs when spreadsheet applications interpret cell values
 * as formulas. Attackers can inject formulas like =cmd|'/c calc'!A1 that execute
 * arbitrary commands when the CSV is opened.
 *
 * Prevention strategy:
 * 1. Detect formula-triggering characters at the start of cell values
 * 2. Prepend single quote to neutralize formula interpretation
 * 3. Escape double quotes per RFC 4180
 * 4. Wrap cells containing commas/newlines in double quotes
 *
 * @param value - Raw cell value (may be null/undefined)
 * @returns Sanitized cell value safe for CSV export
 *
 * @example
 * sanitizeCsvCell('=cmd|"/c calc"!A1') // => "'=cmd|""/c calc""!A1"
 * sanitizeCsvCell('Normal text') // => 'Normal text'
 * sanitizeCsvCell('Has, comma') // => '"Has, comma"'
 */
export function sanitizeCsvCell(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  let cellValue = String(value);

  // Step 1: Neutralize formula triggers
  // If cell starts with formula character, prepend single quote
  if (FORMULA_TRIGGERS.some((trigger) => cellValue.startsWith(trigger))) {
    cellValue = "'" + cellValue;
  }

  // Step 2: RFC 4180 escaping
  // Escape double quotes by doubling them
  cellValue = cellValue.replace(/"/g, '""');

  // Step 3: Wrap in quotes if contains comma, newline, or quote
  if (cellValue.includes(',') || cellValue.includes('\n') || cellValue.includes('"')) {
    cellValue = `"${cellValue}"`;
  }

  return cellValue;
}

/**
 * Sanitizes an entire row of CSV cells.
 *
 * @param row - Array of cell values
 * @returns Comma-separated row string with all cells sanitized
 *
 * @example
 * sanitizeCsvRow(['Name', '=SUM(A1:A10)', 'Status'])
 * // => 'Name,"\'=SUM(A1:A10)",Status'
 */
export function sanitizeCsvRow(row: any[]): string {
  return row.map(sanitizeCsvCell).join(',');
}

/**
 * Sanitizes a complete CSV dataset (headers + rows).
 *
 * @param headers - Column header names
 * @param rows - 2D array of row data
 * @returns Complete CSV string with headers and sanitized data
 *
 * @example
 * sanitizeCsv(
 *   ['Name', 'Formula', 'Status'],
 *   [['John', '=1+1', 'Active'], ['Jane', '@IMPORT', 'Pending']]
 * )
 * // => 'Name,Formula,Status\nJohn,"\'=1+1",Active\nJane,"\'@IMPORT",Pending'
 */
export function sanitizeCsv(headers: string[], rows: any[][]): string {
  const sanitizedHeaders = sanitizeCsvRow(headers);
  const sanitizedRows = rows.map((row) => sanitizeCsvRow(row));
  return [sanitizedHeaders, ...sanitizedRows].join('\n');
}
