---
gxp_id: US-004-002
title: "Parse JWS Evidence Files"
parent_id: REQ-004
as_a: "ROSIE Middleware System"
i_want: "to parse JWS (JSON Web Signature) evidence files"
so_that: "I can extract cryptographic evidence and verify signatures"
acceptance_criteria:
  - Use node-jose library for JWS parsing
  - Extract header (algorithm, type), payload (test data), signature
  - Decode base64url-encoded sections
  - Return structured object for database storage
  - Handle invalid JWS format gracefully
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in Artifact Parser Service:

```typescript
async parseJWS(fileContent: string): Promise<ParsedJWS> {
  try {
    // Load public key from system configuration
    const publicKey = await this.getPublicKeyFromConfig();

    if (!publicKey) {
      // Parse structure without cryptographic verification
      const parts = fileContent.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const signature = parts[2];

      this.logger.warn('JWS parsed without signature verification - no public key configured');

      return {
        header,
        payload,
        signature,
        isValid: false,
        error: 'No verification key configured',
      };
    }

    // Create keystore and verify signature
    const keystore = await jose.JWK.asKeyStore({ keys: [JSON.parse(publicKey)] });
    const jws = await jose.JWS.createVerify(keystore).verify(fileContent);

    return {
      header: jws.header,
      payload: JSON.parse(jws.payload.toString()),
      signature: jws.signature,
      isValid: true,
    };
  } catch (error) {
    this.logger.error(`Failed to parse JWS: ${error.message}`);
    return {
      header: null,
      payload: null,
      signature: null,
      isValid: false,
      error: error.message,
    };
  }
}
```

## JWS File Format

```json
{
  "header": {
    "alg": "ES256",
    "typ": "JWS"
  },
  "payload": {
    "test_id": "TEST-001",
    "test_name": "Repository Service Unit Tests",
    "test_results": {
      "passed": 25,
      "failed": 0,
      "skipped": 2
    },
    "system_state_hash": "sha256:abc123...",
    "timestamp": "2026-02-03T12:00:00Z"
  },
  "signature": "base64url-encoded signature"
}
```

## Signature Verification

- Use public key from system context or configuration
- Verify signature matches payload hash
- Record verification status in database
- Future: Support multiple signature algorithms (ES256, RS256)

## Test Scenarios

1. **Valid JWS**: Parse well-formed JWS file → Returns parsed structure
2. **Invalid Signature**: Parse JWS with tampered payload → isValid = false
3. **Malformed JWS**: Parse non-JWS JSON file → Returns error, isValid = false
4. **Missing Sections**: Parse JWS with missing header → Returns error

## Implementing Specification

SPEC-004-002: JWS Evidence Parser Implementation
