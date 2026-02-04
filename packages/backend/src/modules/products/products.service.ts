import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db, products, productRepositories, repositories } from '@/db';
import { eq, desc, and } from 'drizzle-orm';
import { CreateProductDto } from './dto/create-product.dto';
import { LinkRepositoryDto } from './dto/link-repository.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  /**
   * Create a new product
   */
  async create(dto: CreateProductDto) {
    const [product] = await db
      .insert(products)
      .values({
        name: dto.name,
        description: dto.description,
        gtin: dto.gtin,
        manufacturerId: dto.manufacturerId,
        productType: dto.productType,
        riskLevel: dto.riskLevel,
        regulatoryStatus: dto.regulatoryStatus,
      })
      .returning();

    this.logger.log(`Created product: ${product.name} (${product.id})`);

    return product;
  }

  /**
   * Get all products
   */
  async findAll() {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  /**
   * Get product by ID
   */
  async findOne(id: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Update product
   */
  async update(id: string, data: Partial<CreateProductDto>) {
    const [updated] = await db
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    this.logger.log(`Updated product: ${id}`);

    return updated;
  }

  /**
   * Delete product
   */
  async remove(id: string) {
    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    this.logger.log(`Deleted product: ${id}`);

    return deleted;
  }

  /**
   * Link a repository to a product
   */
  async linkRepository(productId: string, dto: LinkRepositoryDto) {
    // Verify product exists
    await this.findOne(productId);

    // Verify repository exists
    const [repo] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, dto.repositoryId));

    if (!repo) {
      throw new NotFoundException(
        `Repository with ID ${dto.repositoryId} not found`,
      );
    }

    // Check if link already exists
    const [existing] = await db
      .select()
      .from(productRepositories)
      .where(
        and(
          eq(productRepositories.productId, productId),
          eq(productRepositories.repositoryId, dto.repositoryId),
        ),
      );

    if (existing) {
      throw new BadRequestException(
        'Product is already linked to this repository',
      );
    }

    const [link] = await db
      .insert(productRepositories)
      .values({
        productId,
        repositoryId: dto.repositoryId,
        version: dto.version,
        releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
        isPrimary: dto.isPrimary ?? false,
      })
      .returning();

    this.logger.log(
      `Linked repository ${dto.repositoryId} to product ${productId}`,
    );

    return link;
  }

  /**
   * Unlink a repository from a product
   */
  async unlinkRepository(productId: string, repositoryId: string) {
    const [deleted] = await db
      .delete(productRepositories)
      .where(
        and(
          eq(productRepositories.productId, productId),
          eq(productRepositories.repositoryId, repositoryId),
        ),
      )
      .returning();

    if (!deleted) {
      throw new NotFoundException(
        `Link between product ${productId} and repository ${repositoryId} not found`,
      );
    }

    this.logger.log(
      `Unlinked repository ${repositoryId} from product ${productId}`,
    );

    return deleted;
  }

  /**
   * Get all linked repositories for a product
   */
  async getLinkedRepositories(productId: string) {
    // Verify product exists
    await this.findOne(productId);

    const links = await db
      .select({
        id: productRepositories.id,
        version: productRepositories.version,
        releaseDate: productRepositories.releaseDate,
        isPrimary: productRepositories.isPrimary,
        createdAt: productRepositories.createdAt,
        repository: repositories,
      })
      .from(productRepositories)
      .innerJoin(
        repositories,
        eq(productRepositories.repositoryId, repositories.id),
      )
      .where(eq(productRepositories.productId, productId))
      .orderBy(desc(productRepositories.createdAt));

    return links;
  }

  /**
   * Get products by manufacturer ID
   */
  async getProductsByManufacturer(manufacturerId: string) {
    return db
      .select()
      .from(products)
      .where(eq(products.manufacturerId, manufacturerId))
      .orderBy(desc(products.createdAt));
  }
}
