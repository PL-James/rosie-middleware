import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductAggregationService } from './product-aggregation.service';
import { CreateProductDto } from './dto/create-product.dto';
import { LinkRepositoryDto } from './dto/link-repository.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly aggregationService: ProductAggregationService,
  ) {}

  // ========== CRUD Operations ==========

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: Partial<CreateProductDto>,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // ========== Repository Linking ==========

  @Post(':id/repositories')
  @HttpCode(HttpStatus.CREATED)
  linkRepository(
    @Param('id') id: string,
    @Body() linkRepositoryDto: LinkRepositoryDto,
  ) {
    return this.productsService.linkRepository(id, linkRepositoryDto);
  }

  @Delete(':id/repositories/:repoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkRepository(
    @Param('id') id: string,
    @Param('repoId') repoId: string,
  ) {
    return this.productsService.unlinkRepository(id, repoId);
  }

  @Get(':id/repositories')
  getLinkedRepositories(@Param('id') id: string) {
    return this.productsService.getLinkedRepositories(id);
  }

  // ========== Aggregated Views ==========

  @Get(':id/artifacts')
  getAggregatedArtifacts(@Param('id') id: string) {
    return this.aggregationService.aggregateArtifacts(id);
  }

  @Get(':id/compliance')
  getComplianceSummary(@Param('id') id: string) {
    return this.aggregationService.aggregateCompliance(id);
  }

  @Get(':id/risk-assessment')
  getRiskAssessment(@Param('id') id: string) {
    return this.aggregationService.aggregateRisk(id);
  }

  @Get(':id/traceability')
  getTraceabilityValidation(@Param('id') id: string) {
    return this.aggregationService.validateCrossRepoTraceability(id);
  }
}
