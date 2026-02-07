---
gxp_id: SPEC-004-002
title: "JWS Evidence Parser Implementation"
parent_id: US-004-002
verification_tier: OQ
design_approach: |
  Implement JWS parser using node-jose library. Extract header, payload, and
  signature components for storage and verification.
source_files:
  - packages/backend/src/modules/artifacts/jws-parser.service.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Operational Qualification (OQ)

Verifies JWS parsing extracts cryptographic evidence correctly.

## Implementation

```typescript
async parseJWS(fileContent: string, publicKey?: string): Promise<ParsedJWS> {
  try {
    // If no key provided, attempt to extract without verification
    // (signature will be marked as unverified)
    if (!publicKey) {
      // Parse structure without cryptographic verification
      const parts = fileContent.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const signature = parts[2];

      return {
        header,
        payload,
        signature,
        isValid: false,
        error: 'No verification key provided',
      };
    }

    // Load public key from configuration or system context
    const keystore = await jose.JWK.asKeyStore({ keys: [JSON.parse(publicKey)] });

    // Verify signature with public key
    const jws = await jose.JWS.createVerify(keystore).verify(fileContent);

    return {
      header: jws.header,
      payload: JSON.parse(jws.payload.toString()),
      signature: jws.signature,
      isValid: true,
    };
  } catch (error) {
    return {
      header: null,
      payload: null,
      signature: null,
      isValid: false,
      error: error.message
    };
  }
}
```

## Verification Method

**Tests:**
- Valid JWS → Returns parsed structure
- Invalid signature → isValid = false
- Malformed JWS → Returns error

## Implementation Files

- `packages/backend/src/modules/artifacts/jws-parser.service.ts`
