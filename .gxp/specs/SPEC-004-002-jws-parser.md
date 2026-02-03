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
---

## Operational Qualification (OQ)

Verifies JWS parsing extracts cryptographic evidence correctly.

## Implementation

```typescript
async parseJWS(fileContent: string): Promise<ParsedJWS> {
  try {
    const jws = await jose.JWS.createVerify().verify(fileContent);
    return {
      header: jws.header,
      payload: JSON.parse(jws.payload.toString()),
      signature: jws.signature,
      isValid: true,
    };
  } catch (error) {
    return { header: null, payload: null, signature: null, isValid: false, error: error.message };
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
