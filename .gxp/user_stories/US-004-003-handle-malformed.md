---
gxp_id: US-004-003
title: "Handle Malformed Content"
parent_id: REQ-004
as_a: "ROSIE Middleware System"
i_want: "to gracefully handle malformed YAML and JWS files without crashing"
so_that: "I can complete scans even when some artifacts have parsing errors"
acceptance_criteria:
  - Catch YAML parsing exceptions and log errors
  - Catch JWS parsing exceptions and log errors
  - Continue scan after encountering malformed file
  - Mark artifact as parse_error in database
  - Include error message in artifact record
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented with try-catch blocks in Scanner Service:

```typescript
async parsePhase(files: FileContent[]): Promise<ParsedArtifact[]> {
  const parsed = [];

  for (const file of files) {
    try {
      const result = await this.artifactParser.parse(file.path, file.content);
      parsed.push(result);
    } catch (error) {
      this.logger.error(`Parse error in ${file.path}: ${error.message}`);

      // Create error artifact
      parsed.push({
        path: file.path,
        type: this.detectType(file.path),
        parseError: true,
        errorMessage: error.message,
        data: null,
      });
    }
  }

  return parsed;
}
```

## Error Handling Strategy

**Recoverable Errors (log and continue):**
- Malformed YAML frontmatter
- Invalid JWS structure
- Missing required fields in YAML
- Base64 decoding errors

**Fatal Errors (stop scan):**
- GitHub API authentication failure
- Database connection lost
- Disk space exhausted

## Database Recording

Malformed artifacts still recorded in database:

```typescript
{
  gxp_id: null,
  title: "Parse Error",
  file_path: ".gxp/requirements/REQ-001.md",
  parse_error: true,
  error_message: "YAMLException: unexpected end of the stream",
  validation_status: "ERROR"
}
```

## Test Scenarios

1. **Malformed YAML**: Scan file with invalid YAML → Logs error, scan continues
2. **Missing Delimiter**: Scan file without closing `---` → Logs error, scan continues
3. **Invalid JWS**: Scan .jws file with corrupted structure → Logs error, scan continues
4. **Mixed Valid/Invalid**: Scan 10 files (8 valid, 2 malformed) → Returns 8 parsed + 2 error records

## User Experience

Error artifacts visible in UI:
- Red error badge in artifact list
- Error message displayed in artifact detail modal
- Scan summary: "43 artifacts found, 2 parse errors"
- Link to source file on GitHub for manual inspection

## Implementing Specification

SPEC-004-001: YAML Frontmatter Parser Implementation
SPEC-004-002: JWS Evidence Parser Implementation
