import { Controller, Get, Param } from '@nestjs/common';
import { TraceabilityValidatorService } from './traceability-validator.service';
import { db, traceabilityLinks } from '@/db';
import { eq } from 'drizzle-orm';

@Controller('api/v1/repositories/:id/traceability')
export class TraceabilityController {
  constructor(
    private validatorService: TraceabilityValidatorService,
  ) {}

  /**
   * Run traceability audit
   * Validates all links and returns broken links
   */
  @Get('audit')
  async audit(@Param('id') repositoryId: string) {
    await this.validatorService.buildTraceabilityGraph(repositoryId);
    const brokenLinks = await this.validatorService.detectBrokenLinks(repositoryId);

    return {
      repositoryId,
      status: brokenLinks.length === 0 ? 'valid' : 'invalid',
      brokenLinksCount: brokenLinks.length,
      brokenLinks,
    };
  }

  /**
   * Get traceability chain for a specific document
   */
  @Get('chain/:documentId')
  async getChain(
    @Param('id') repositoryId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.validatorService.getTraceabilityChain(repositoryId, documentId);
  }

  /**
   * Get graph visualization data
   * Returns nodes and edges for D3.js/Cytoscape
   */
  @Get('graph')
  async getGraph(@Param('id') repositoryId: string) {
    const links = await db
      .select()
      .from(traceabilityLinks)
      .where(eq(traceabilityLinks.repositoryId, repositoryId));

    const nodes = new Set<string>();
    const edges = [];

    for (const link of links) {
      nodes.add(link.parentGxpId);
      nodes.add(link.childGxpId);
      edges.push({
        source: link.parentGxpId,
        target: link.childGxpId,
        type: `${link.parentType}_to_${link.childType}`,
        valid: link.isValid,
      });
    }

    return {
      nodes: Array.from(nodes).map((id) => ({ id })),
      edges,
    };
  }
}
