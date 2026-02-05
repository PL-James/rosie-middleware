import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const scanStatusEnum = pgEnum('scan_status', [
  'pending',
  'queued',
  'in_progress',
  'completed',
  'failed',
]);

export const validationStatusEnum = pgEnum('validation_status', [
  'DRAFT',
  'VALIDATED',
  'DEPRECATED',
]);

export const riskRatingEnum = pgEnum('risk_rating', ['HIGH', 'MEDIUM', 'LOW']);

export const verificationTierEnum = pgEnum('verification_tier', [
  'IQ',
  'OQ',
  'PQ',
]);

export const artifactTypeEnum = pgEnum('artifact_type', [
  'requirement',
  'user_story',
  'spec',
  'evidence',
]);

// Repositories
export const repositories = pgTable(
  'repositories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    gitUrl: text('git_url').notNull(),
    description: text('description'),
    owner: varchar('owner', { length: 255 }).notNull(),
    repo: varchar('repo', { length: 255 }).notNull(),
    defaultBranch: varchar('default_branch', { length: 100 }).default('main'),
    autoScan: boolean('auto_scan').default(false),
    scanIntervalMinutes: integer('scan_interval_minutes').default(60),
    lastScanId: uuid('last_scan_id'),
    lastScanAt: timestamp('last_scan_at'),
    lastScanStatus: scanStatusEnum('last_scan_status'),
    isRosieCompliant: boolean('is_rosie_compliant').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    gitUrlIdx: uniqueIndex('git_url_idx').on(table.gitUrl),
    ownerRepoIdx: index('owner_repo_idx').on(table.owner, table.repo),
    lastScanAtIdx: index('last_scan_at_idx').on(table.lastScanAt),
  }),
);

// Scans
export const scans = pgTable(
  'scans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    status: scanStatusEnum('status').notNull().default('pending'),
    commitSha: varchar('commit_sha', { length: 40 }),
    commitMessage: text('commit_message'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    durationMs: integer('duration_ms'),
    artifactsFound: integer('artifacts_found').default(0),
    artifactsCreated: integer('artifacts_created').default(0),
    artifactsUpdated: integer('artifacts_updated').default(0),
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('scan_repository_id_idx').on(table.repositoryId),
    statusIdx: index('scan_status_idx').on(table.status),
    createdAtIdx: index('scan_created_at_idx').on(table.createdAt),
  }),
);

// File Checksums (for incremental scanning)
export const fileChecksums = pgTable(
  'file_checksums',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    filePath: text('file_path').notNull(),
    sha256Hash: varchar('sha256_hash', { length: 64 }).notNull(),
    lastScannedAt: timestamp('last_scanned_at').notNull().defaultNow(),
    artifactId: uuid('artifact_id'), // Link to requirement/user_story/spec/evidence
    artifactType: artifactTypeEnum('artifact_type'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('file_checksum_repository_id_idx').on(table.repositoryId),
    filePathIdx: index('file_checksum_file_path_idx').on(table.repositoryId, table.filePath),
    uniqueFilePath: uniqueIndex('file_checksum_unique_repo_path').on(
      table.repositoryId,
      table.filePath,
    ),
  }),
);

// System Contexts (Apex Document)
export const systemContexts = pgTable(
  'system_contexts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    projectName: varchar('project_name', { length: 255 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    gxpRiskRating: riskRatingEnum('gxp_risk_rating').notNull(),
    validationStatus: validationStatusEnum('validation_status').notNull(),
    intendedUse: text('intended_use'),
    regulatory: text('regulatory'),
    systemOwner: varchar('system_owner', { length: 255 }),
    technicalContact: varchar('technical_contact', { length: 255 }),
    sections: jsonb('sections'), // Full parsed markdown sections
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: uniqueIndex('system_context_repository_id_idx').on(
      table.repositoryId,
    ),
    versionIdx: index('system_context_version_idx').on(table.version),
  }),
);

// Requirements (Level 1: REQ)
export const requirements = pgTable(
  'requirements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    gxpId: varchar('gxp_id', { length: 50 }).notNull(), // e.g., REQ-001
    title: text('title').notNull(),
    description: text('description'),
    gxpRiskRating: riskRatingEnum('gxp_risk_rating'),
    acceptanceCriteria: jsonb('acceptance_criteria'), // Array of strings
    filePath: text('file_path').notNull(),
    rawContent: text('raw_content'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('requirement_repository_id_idx').on(
      table.repositoryId,
    ),
    gxpIdIdx: uniqueIndex('requirement_gxp_id_idx').on(
      table.repositoryId,
      table.gxpId,
    ),
    riskRatingIdx: index('requirement_risk_rating_idx').on(
      table.gxpRiskRating,
    ),
  }),
);

// User Stories (Level 2: US)
export const userStories = pgTable(
  'user_stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    requirementId: uuid('requirement_id').references(() => requirements.id, {
      onDelete: 'set null',
    }),
    gxpId: varchar('gxp_id', { length: 50 }).notNull(), // e.g., US-042
    parentId: varchar('parent_id', { length: 50 }), // e.g., REQ-001
    title: text('title').notNull(),
    description: text('description'),
    asA: text('as_a'),
    iWant: text('i_want'),
    soThat: text('so_that'),
    acceptanceCriteria: jsonb('acceptance_criteria'),
    status: varchar('status', { length: 50 }), // draft, in_progress, completed
    filePath: text('file_path').notNull(),
    rawContent: text('raw_content'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('user_story_repository_id_idx').on(
      table.repositoryId,
    ),
    gxpIdIdx: uniqueIndex('user_story_gxp_id_idx').on(
      table.repositoryId,
      table.gxpId,
    ),
    requirementIdIdx: index('user_story_requirement_id_idx').on(
      table.requirementId,
    ),
    parentIdIdx: index('user_story_parent_id_idx').on(table.parentId),
  }),
);

// Specs (Level 3: SPEC)
export const specs = pgTable(
  'specs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    userStoryId: uuid('user_story_id').references(() => userStories.id, {
      onDelete: 'set null',
    }),
    gxpId: varchar('gxp_id', { length: 50 }).notNull(), // e.g., SPEC-042-001
    parentId: varchar('parent_id', { length: 50 }), // e.g., US-042
    title: text('title').notNull(),
    description: text('description'),
    designApproach: text('design_approach'),
    implementationNotes: text('implementation_notes'),
    verificationTier: verificationTierEnum('verification_tier'),
    sourceFiles: jsonb('source_files'), // Array of file paths
    testFiles: jsonb('test_files'), // Array of test file paths
    filePath: text('file_path').notNull(),
    rawContent: text('raw_content'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('spec_repository_id_idx').on(table.repositoryId),
    gxpIdIdx: uniqueIndex('spec_gxp_id_idx').on(
      table.repositoryId,
      table.gxpId,
    ),
    userStoryIdIdx: index('spec_user_story_id_idx').on(table.userStoryId),
    parentIdIdx: index('spec_parent_id_idx').on(table.parentId),
    verificationTierIdx: index('spec_verification_tier_idx').on(
      table.verificationTier,
    ),
  }),
);

// Evidence (JWS Artifacts)
export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    specId: uuid('spec_id').references(() => specs.id, {
      onDelete: 'set null',
    }),
    gxpId: varchar('gxp_id', { length: 50 }), // Linked spec ID
    fileName: varchar('file_name', { length: 255 }).notNull(),
    filePath: text('file_path').notNull(),
    verificationTier: verificationTierEnum('verification_tier'),
    jwsPayload: jsonb('jws_payload'), // Parsed JWS payload
    jwsHeader: jsonb('jws_header'), // JWS header
    signature: text('signature'),
    isSignatureValid: boolean('is_signature_valid'),
    signatureVerifiedAt: timestamp('signature_verified_at'),
    testResults: jsonb('test_results'), // Test execution results
    systemState: text('system_state'), // Hash of system state
    timestamp: timestamp('timestamp'), // Evidence creation timestamp
    rawContent: text('raw_content'), // Full JWS file content
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('evidence_repository_id_idx').on(
      table.repositoryId,
    ),
    specIdIdx: index('evidence_spec_id_idx').on(table.specId),
    gxpIdIdx: index('evidence_gxp_id_idx').on(table.gxpId),
    verificationTierIdx: index('evidence_verification_tier_idx').on(
      table.verificationTier,
    ),
  }),
);

// Traceability Links (Materialized)
export const traceabilityLinks = pgTable(
  'traceability_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').notNull(),
    parentGxpId: varchar('parent_gxp_id', { length: 50 }).notNull(),
    parentType: artifactTypeEnum('parent_type').notNull(),
    childId: uuid('child_id').notNull(),
    childGxpId: varchar('child_gxp_id', { length: 50 }).notNull(),
    childType: artifactTypeEnum('child_type').notNull(),
    isValid: boolean('is_valid').default(true),
    validationMessage: text('validation_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('traceability_repository_id_idx').on(
      table.repositoryId,
    ),
    parentIdIdx: index('traceability_parent_id_idx').on(table.parentId),
    childIdIdx: index('traceability_child_id_idx').on(table.childId),
    isValidIdx: index('traceability_is_valid_idx').on(table.isValid),
  }),
);

// Audit Log
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 255 }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }),
    resourceId: uuid('resource_id'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    requestMethod: varchar('request_method', { length: 10 }),
    requestPath: text('request_path'),
    requestPayloadHash: varchar('request_payload_hash', { length: 64 }),
    responseStatus: integer('response_status'),
    metadata: jsonb('metadata'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),
    userIdIdx: index('audit_log_user_id_idx').on(table.userId),
    actionIdx: index('audit_log_action_idx').on(table.action),
    resourceIdx: index('audit_log_resource_idx').on(
      table.resourceType,
      table.resourceId,
    ),
  }),
);

// Compliance Reports
export const complianceReports = pgTable(
  'compliance_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    reportType: varchar('report_type', { length: 50 }).notNull(),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
    generatedBy: varchar('generated_by', { length: 255 }),
    reportData: jsonb('report_data').notNull(),
    complianceScore: integer('compliance_score'),
    overallRisk: varchar('overall_risk', { length: 10 }),
    pdfUrl: text('pdf_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    repositoryIdIdx: index('compliance_report_repository_id_idx').on(
      table.repositoryId,
    ),
    generatedAtIdx: index('compliance_report_generated_at_idx').on(
      table.generatedAt,
    ),
  }),
);

// Relations
export const repositoriesRelations = relations(repositories, ({ many }) => ({
  scans: many(scans),
  systemContexts: many(systemContexts),
  requirements: many(requirements),
  userStories: many(userStories),
  specs: many(specs),
  evidence: many(evidence),
  traceabilityLinks: many(traceabilityLinks),
  complianceReports: many(complianceReports),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [scans.repositoryId],
    references: [repositories.id],
  }),
  systemContexts: many(systemContexts),
  requirements: many(requirements),
  userStories: many(userStories),
  specs: many(specs),
  evidence: many(evidence),
}));

export const fileChecksumsRelations = relations(fileChecksums, ({ one }) => ({
  repository: one(repositories, {
    fields: [fileChecksums.repositoryId],
    references: [repositories.id],
  }),
}));

export const requirementsRelations = relations(requirements, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [requirements.repositoryId],
    references: [repositories.id],
  }),
  scan: one(scans, {
    fields: [requirements.scanId],
    references: [scans.id],
  }),
  userStories: many(userStories),
}));

export const userStoriesRelations = relations(userStories, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [userStories.repositoryId],
    references: [repositories.id],
  }),
  scan: one(scans, {
    fields: [userStories.scanId],
    references: [scans.id],
  }),
  requirement: one(requirements, {
    fields: [userStories.requirementId],
    references: [requirements.id],
  }),
  specs: many(specs),
}));

export const specsRelations = relations(specs, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [specs.repositoryId],
    references: [repositories.id],
  }),
  scan: one(scans, {
    fields: [specs.scanId],
    references: [scans.id],
  }),
  userStory: one(userStories, {
    fields: [specs.userStoryId],
    references: [userStories.id],
  }),
  evidence: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  repository: one(repositories, {
    fields: [evidence.repositoryId],
    references: [repositories.id],
  }),
  scan: one(scans, {
    fields: [evidence.scanId],
    references: [scans.id],
  }),
  spec: one(specs, {
    fields: [evidence.specId],
    references: [specs.id],
  }),
}));

export const complianceReportsRelations = relations(
  complianceReports,
  ({ one }) => ({
    repository: one(repositories, {
      fields: [complianceReports.repositoryId],
      references: [repositories.id],
    }),
  }),
);

// Manufacturers
export const manufacturers = pgTable(
  'manufacturers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    mah: varchar('mah', { length: 20 }),
    country: varchar('country', { length: 100 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('manufacturer_name_idx').on(table.name),
  }),
);

// Products
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    gtin: varchar('gtin', { length: 14 }),
    manufacturerId: uuid('manufacturer_id')
      .notNull()
      .references(() => manufacturers.id, { onDelete: 'cascade' }),
    productType: varchar('product_type', { length: 100 }),
    riskLevel: varchar('risk_level', { length: 10 }),
    regulatoryStatus: varchar('regulatory_status', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('product_name_idx').on(table.name),
    gtinIdx: uniqueIndex('product_gtin_idx').on(table.gtin),
    manufacturerIdx: index('product_manufacturer_idx').on(table.manufacturerId),
  }),
);

// Product-Repository Junction Table (Many-to-Many)
export const productRepositories = pgTable(
  'product_repositories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }),
    releaseDate: timestamp('release_date'),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('product_repo_product_idx').on(table.productId),
    repoIdx: index('product_repo_repo_idx').on(table.repositoryId),
    uniqueLink: uniqueIndex('product_repo_unique').on(
      table.productId,
      table.repositoryId,
    ),
  }),
);

// API Keys
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  userId: text('user_id').notNull(),
  scopes: text('scopes')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  isRevoked: boolean('is_revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// Relations for new tables
export const manufacturersRelations = relations(manufacturers, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [products.manufacturerId],
    references: [manufacturers.id],
  }),
  productRepositories: many(productRepositories),
}));

export const productRepositoriesRelations = relations(
  productRepositories,
  ({ one }) => ({
    product: one(products, {
      fields: [productRepositories.productId],
      references: [products.id],
    }),
    repository: one(repositories, {
      fields: [productRepositories.repositoryId],
      references: [repositories.id],
    }),
  }),
);

// Update repositories relations to include product links
export const repositoriesRelations2 = relations(repositories, ({ many }) => ({
  scans: many(scans),
  systemContexts: many(systemContexts),
  requirements: many(requirements),
  userStories: many(userStories),
  specs: many(specs),
  evidence: many(evidence),
  traceabilityLinks: many(traceabilityLinks),
  productRepositories: many(productRepositories),
}));
