---
gxp_id: SPEC-001-001
title: "Repository Service Implementation"
parent_id: US-001-001
verification_tier: OQ
design_approach: |
  Implement repository management service with CRUD operations for GitHub
  repositories. Service handles URL parsing, validation, and triggers initial
  scans automatically on registration.
source_files:
  - packages/backend/src/modules/repositories/repositories.service.ts
  - packages/backend/src/modules/repositories/repositories.module.ts
  - packages/backend/src/modules/repositories/dto/create-repository.dto.ts
test_files: []
validation_status: DRAFT
assurance_status: DRAFT
---

## Operational Qualification (OQ)

This specification defines repository management logic. OQ verification ensures CRUD operations work correctly and integrate with scanner service.

## Service API

```typescript
@Injectable()
export class RepositoriesService {
  constructor(
    private db: DrizzleService,
    private scannerService: ScannerService
  ) {}

  async findAll(): Promise<Repository[]> {
    return await this.db.select().from(repositories).where(eq(repositories.isActive, true));
  }

  async findOne(id: string): Promise<Repository> {
    const repo = await this.db.select().from(repositories).where(eq(repositories.id, id)).limit(1);
    if (!repo[0]) throw new NotFoundException(`Repository ${id} not found`);
    return repo[0];
  }

  async create(dto: CreateRepositoryDto): Promise<Repository> {
    const parsed = this.parseGitHubUrl(dto.gitUrl);

    const repo = await this.db.insert(repositories).values({
      name: dto.name,
      gitUrl: dto.gitUrl,
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch: dto.defaultBranch || 'main',
    }).returning();

    // Trigger initial scan
    await this.scannerService.scanRepository(repo[0].id);

    return repo[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(repositories).where(eq(repositories.id, id));
  }

  parseGitHubUrl(url: string): { owner: string; repo: string } {
    const patterns = [
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
      /git@github\.com:([^\/]+)\/([^\/]+?)\.git$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }

    throw new BadRequestException('Invalid GitHub URL');
  }
}
```

## DTO Validation

```typescript
export class CreateRepositoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  @Matches(/github\.com/)
  gitUrl: string;

  @IsString()
  @IsOptional()
  defaultBranch?: string;
}
```

## URL Parsing Logic

Supported formats:
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

Extracted fields:
- `owner`: GitHub organization or user
- `repo`: Repository name

## Error Handling

- **Invalid URL**: Throws BadRequestException
- **Duplicate git_url**: Throws ConflictException (database unique constraint)
- **Not Found**: Throws NotFoundException

## Verification Method

**Operational Qualification (OQ):**

1. **Create Repository:**
   - POST with valid URL → Returns repository with ID
   - Verify owner/repo extracted correctly
   - Verify initial scan triggered

2. **URL Parsing:**
   - Test all 3 URL formats → All parsed correctly
   - Test invalid URL → Throws error

3. **Find Operations:**
   - GET all repositories → Returns array
   - GET single repository → Returns object
   - GET non-existent repository → Throws NotFoundException

4. **Delete:**
   - DELETE repository → Succeeds
   - Verify cascading delete removes artifacts

## Implementation Files

- `packages/backend/src/modules/repositories/repositories.service.ts`
- `packages/backend/src/modules/repositories/dto/create-repository.dto.ts`
