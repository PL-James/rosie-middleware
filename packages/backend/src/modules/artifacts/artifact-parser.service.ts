import { Injectable, Logger } from '@nestjs/common';
import matter from 'gray-matter';

export interface ParsedArtifact {
  gxpId?: string;
  title?: string;
  description?: string;
  parentId?: string;
  metadata: Record<string, any>;
  content: string;
  rawContent: string;
}

export interface ParsedSystemContext {
  projectName: string;
  version: string;
  gxpRiskRating: 'HIGH' | 'MEDIUM' | 'LOW';
  validationStatus: 'DRAFT' | 'VALIDATED' | 'DEPRECATED';
  intendedUse?: string;
  regulatory?: string;
  systemOwner?: string;
  technicalContact?: string;
  sections: Record<string, any>;
  rawContent: string;
}

export interface ParsedRequirement extends ParsedArtifact {
  gxpRiskRating?: 'HIGH' | 'MEDIUM' | 'LOW';
  acceptanceCriteria?: string[];
}

export interface ParsedUserStory extends ParsedArtifact {
  asA?: string;
  iWant?: string;
  soThat?: string;
  acceptanceCriteria?: string[];
  status?: string;
}

export interface ParsedSpec extends ParsedArtifact {
  designApproach?: string;
  implementationNotes?: string;
  verificationTier?: 'IQ' | 'OQ' | 'PQ';
  sourceFiles?: string[];
  testFiles?: string[];
}

export interface ParsedEvidence {
  gxpId?: string;
  verificationTier?: 'IQ' | 'OQ' | 'PQ';
  jwsPayload?: Record<string, any>;
  jwsHeader?: Record<string, any>;
  signature?: string;
  testResults?: Record<string, any>;
  systemState?: string;
  timestamp?: Date;
  rawContent: string;
}

@Injectable()
export class ArtifactParserService {
  private readonly logger = new Logger(ArtifactParserService.name);

  /**
   * Parse YAML frontmatter from markdown file
   */
  private parseYamlFrontmatter(content: string): {
    data: Record<string, any>;
    content: string;
  } {
    try {
      const parsed = matter(content);
      return {
        data: parsed.data,
        content: parsed.content,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse YAML frontmatter: ${error.message}`);
      return {
        data: {},
        content,
      };
    }
  }

  /**
   * Parse system_context.md
   */
  parseSystemContext(content: string): ParsedSystemContext {
    const { data, content: markdown } = this.parseYamlFrontmatter(content);

    // Extract sections from markdown
    const sections: Record<string, string> = {};
    const sectionRegex = /^##\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    const sectionStarts: Array<{ title: string; index: number }> = [];

    while ((match = sectionRegex.exec(markdown)) !== null) {
      sectionStarts.push({ title: match[1], index: match.index });
    }

    for (let i = 0; i < sectionStarts.length; i++) {
      const current = sectionStarts[i];
      const next = sectionStarts[i + 1];
      const sectionContent = markdown
        .slice(current.index, next?.index)
        .replace(/^##\s+.+$/m, '')
        .trim();
      sections[current.title] = sectionContent;
    }

    return {
      projectName: data.project_name || data.projectName || 'Unknown',
      version: data.version || '0.0.0',
      gxpRiskRating: data.gxp_risk_rating || data.gxpRiskRating || 'MEDIUM',
      validationStatus:
        data.validation_status || data.validationStatus || 'DRAFT',
      intendedUse: data.intended_use || data.intendedUse || sections['Intended Use'],
      regulatory: sections['Regulatory'] || sections['Regulatory Context'],
      systemOwner: data.system_owner || data.systemOwner,
      technicalContact: data.technical_contact || data.technicalContact,
      sections,
      rawContent: content,
    };
  }

  /**
   * Parse requirement file
   */
  parseRequirement(content: string, filePath: string): ParsedRequirement {
    const { data, content: markdown } = this.parseYamlFrontmatter(content);

    // Extract GXP ID from frontmatter or filename
    const gxpId =
      data.gxp_id ||
      data.id ||
      filePath.match(/REQ-\d+/)?.[0] ||
      filePath.match(/([^\/]+)\.md$/)?.[1];

    return {
      gxpId,
      title: data.title || markdown.split('\n')[0].replace(/^#\s+/, ''),
      description: data.description || markdown,
      gxpRiskRating: data.gxp_risk_rating || data.risk || data.gxpRiskRating,
      acceptanceCriteria: data.acceptance_criteria || data.acceptanceCriteria,
      metadata: data,
      content: markdown,
      rawContent: content,
    };
  }

  /**
   * Parse user story file
   */
  parseUserStory(content: string, filePath: string): ParsedUserStory {
    const { data, content: markdown } = this.parseYamlFrontmatter(content);

    // Extract GXP ID from frontmatter or filename
    const gxpId =
      data.gxp_id ||
      data.id ||
      filePath.match(/US-\d+/)?.[0] ||
      filePath.match(/([^\/]+)\.md$/)?.[1];

    const parentId = data.parent_id || data.requirement || data.parentId;

    return {
      gxpId,
      parentId,
      title: data.title || markdown.split('\n')[0].replace(/^#\s+/, ''),
      description: data.description || markdown,
      asA: data.as_a || data.asA,
      iWant: data.i_want || data.iWant,
      soThat: data.so_that || data.soThat,
      acceptanceCriteria: data.acceptance_criteria || data.acceptanceCriteria,
      status: data.status,
      metadata: data,
      content: markdown,
      rawContent: content,
    };
  }

  /**
   * Parse spec file
   */
  parseSpec(content: string, filePath: string): ParsedSpec {
    const { data, content: markdown } = this.parseYamlFrontmatter(content);

    // Extract GXP ID from frontmatter or filename
    const gxpId =
      data.gxp_id ||
      data.id ||
      filePath.match(/SPEC-\d+-\d+/)?.[0] ||
      filePath.match(/([^\/]+)\.md$/)?.[1];

    const parentId = data.parent_id || data.user_story || data.parentId;

    return {
      gxpId,
      parentId,
      title: data.title || markdown.split('\n')[0].replace(/^#\s+/, ''),
      description: data.description || markdown,
      designApproach: data.design_approach || data.designApproach,
      implementationNotes:
        data.implementation_notes || data.implementationNotes,
      verificationTier:
        data.verification_tier || data.tier || data.verificationTier,
      sourceFiles: data.source_files || data.sourceFiles,
      testFiles: data.test_files || data.testFiles,
      metadata: data,
      content: markdown,
      rawContent: content,
    };
  }

  /**
   * Parse JWS evidence file
   */
  parseEvidence(content: string, fileName: string): ParsedEvidence {
    try {
      // JWS format: header.payload.signature
      const parts = content.trim().split('.');

      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }

      // Decode header and payload (base64url)
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf-8'),
      );
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      );
      const signature = parts[2];

      // Extract metadata from payload
      const gxpId = payload.spec_id || payload.gxpId;
      const verificationTier = payload.verification_tier || payload.tier;
      const testResults = payload.test_results || payload.results;
      const systemState = payload.system_state || payload.state;
      const timestamp = payload.timestamp
        ? new Date(payload.timestamp)
        : undefined;

      return {
        gxpId,
        verificationTier,
        jwsPayload: payload,
        jwsHeader: header,
        signature,
        testResults,
        systemState,
        timestamp,
        rawContent: content,
      };
    } catch (error) {
      this.logger.error(`Failed to parse JWS evidence: ${error.message}`);
      return {
        rawContent: content,
      };
    }
  }

  /**
   * Determine artifact type from file path
   */
  getArtifactType(
    filePath: string,
  ): 'requirement' | 'user_story' | 'spec' | 'evidence' | 'unknown' {
    if (filePath.includes('/requirements/') || filePath.match(/REQ-\d+/)) {
      return 'requirement';
    }

    if (filePath.includes('/user_stories/') || filePath.match(/US-\d+/)) {
      return 'user_story';
    }

    if (filePath.includes('/specs/') || filePath.match(/SPEC-\d+-\d+/)) {
      return 'spec';
    }

    if (filePath.includes('/evidence/') && filePath.endsWith('.jws')) {
      return 'evidence';
    }

    return 'unknown';
  }
}
