---
gxp_id: US-004-001
title: "Parse YAML Frontmatter"
parent_id: REQ-004
as_a: "ROSIE Middleware System"
i_want: "to parse YAML frontmatter from markdown files"
so_that: "I can extract GxP metadata (gxp_id, title, risk_rating, parent_id)"
acceptance_criteria:
  - Use gray-matter library for YAML parsing
  - Extract all frontmatter fields into structured object
  - Handle missing frontmatter gracefully
  - Support both snake_case and camelCase field names
  - Return { data, content } where data is parsed YAML object
status: IMPLEMENTED
validation_status: DRAFT
assurance_status: DRAFT
---

## Implementation Details

Implemented in Artifact Parser Service:

```typescript
parseMarkdown(fileContent: string): ParsedArtifact {
  const result = matter(fileContent);

  // Normalize field names to snake_case
  const data = this.normalizeFieldNames(result.data);

  return {
    data: data,
    content: result.content,
  };
}

private normalizeFieldNames(data: any): any {
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    normalized[snakeKey] = value;
  }
  return normalized;
}
```

## YAML Frontmatter Format

```yaml
---
gxp_id: REQ-001
title: "Repository Management"
gxp_risk_rating: MEDIUM
description: "System shall provide repository management capabilities"
acceptance_criteria:
  - Register repositories via API
  - Validate GitHub URLs
validation_status: DRAFT
---

# Markdown Content

Additional documentation here...
```

## Field Extraction

**Parsed Data Object:**
```typescript
{
  gxp_id: "REQ-001",
  title: "Repository Management",
  gxp_risk_rating: "MEDIUM",
  description: "System shall provide repository management capabilities",
  acceptance_criteria: [
    "Register repositories via API",
    "Validate GitHub URLs"
  ],
  validation_status: "DRAFT"
}
```

## Test Scenarios

1. **Valid Frontmatter**: Parse file with complete YAML → Returns all fields
2. **Missing Frontmatter**: Parse file without `---` markers → Returns empty data object
3. **Malformed YAML**: Parse file with invalid YAML syntax → Throws error (caught by caller)
4. **camelCase Fields**: Parse file with gxpId instead of gxp_id → Normalizes to snake_case
5. **Nested Objects**: Parse frontmatter with nested YAML → Preserves structure

## Implementing Specification

SPEC-004-001: YAML Frontmatter Parser Implementation
