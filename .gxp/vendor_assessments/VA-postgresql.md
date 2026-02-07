---
vendor_name: "PostgreSQL Global Development Group"
product: "PostgreSQL"
product_version: "18.0"
certification_type: "Community Open-Source Quality Process"
certification_date: "2025-11-21"
expiry_date: "2026-11-21"
assessor: "james@pharmaledger.org"
assessment_date: "2026-02-07"
scope: |
  Database engine reliability, ACID transaction compliance, data integrity,
  crash recovery, backup and point-in-time recovery, and security
  vulnerability management via the PostgreSQL Security Team.
risk_reduction_justification: |
  PostgreSQL's 28+ years of production use, active CVE response program,
  extensive regression test suite (40,000+ tests), and widespread adoption
  in regulated industries (healthcare, finance, government) justify reducing
  IQ-level database engine testing to configuration and connectivity
  verification only. Integration-level testing of ROSIE-specific queries
  and schema operations remains required.
---

# Vendor Assessment: PostgreSQL

## Certification Details

PostgreSQL is developed by a global community with a structured release process:

- **Release Cycle**: Annual major releases with 5-year support window
- **Testing**: Comprehensive regression suite with 40,000+ test cases
- **Security**: Dedicated security team with CVE disclosure process
- **Standards**: SQL:2023 compliance, ACID guarantees

## Quality Evidence

- PostgreSQL passes its full regression test suite before every release
- Active CVE monitoring and patch program (average response: < 1 week)
- PGDG provides checksums for all binary distributions
- Used in production by regulated industries globally

## Risk Reduction

This vendor assessment reduces the following testing requirements:

| Testing Area | Without Vendor QA | With Vendor QA |
|-------------|-------------------|----------------|
| ACID compliance | Full transaction testing | Configuration verification only |
| Data integrity | Corruption scenarios | Connection and schema verification |
| Crash recovery | Simulated failures | Backup configuration verification |
| SQL correctness | Query result validation | ROSIE-specific query testing only |

## Integration Points Still Requiring Testing

- Drizzle ORM schema definition correctness
- Migration execution and rollback
- Connection pool configuration
- ROSIE-specific query performance
- Database credential management

## Review Schedule

This vendor assessment expires on 2026-11-21 and must be reviewed before expiry or when upgrading to a new PostgreSQL major version.
