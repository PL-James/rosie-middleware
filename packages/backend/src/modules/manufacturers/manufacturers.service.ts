import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, manufacturers, products } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';

@Injectable()
export class ManufacturersService {
  private readonly logger = new Logger(ManufacturersService.name);

  /**
   * Create a new manufacturer
   */
  async create(dto: CreateManufacturerDto) {
    const [manufacturer] = await db
      .insert(manufacturers)
      .values({
        name: dto.name,
        mah: dto.mah,
        country: dto.country,
        contactEmail: dto.contactEmail,
      })
      .returning();

    this.logger.log(
      `Created manufacturer: ${manufacturer.name} (${manufacturer.id})`,
    );

    return manufacturer;
  }

  /**
   * Get all manufacturers
   */
  async findAll() {
    return db
      .select()
      .from(manufacturers)
      .orderBy(desc(manufacturers.createdAt));
  }

  /**
   * Get manufacturer by ID
   */
  async findOne(id: string) {
    const [manufacturer] = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, id));

    if (!manufacturer) {
      throw new NotFoundException(`Manufacturer with ID ${id} not found`);
    }

    return manufacturer;
  }

  /**
   * Update manufacturer
   */
  async update(id: string, data: Partial<CreateManufacturerDto>) {
    const [updated] = await db
      .update(manufacturers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(manufacturers.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Manufacturer with ID ${id} not found`);
    }

    this.logger.log(`Updated manufacturer: ${id}`);

    return updated;
  }

  /**
   * Delete manufacturer
   */
  async remove(id: string) {
    const [deleted] = await db
      .delete(manufacturers)
      .where(eq(manufacturers.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Manufacturer with ID ${id} not found`);
    }

    this.logger.log(`Deleted manufacturer: ${id}`);

    return deleted;
  }

  /**
   * Get all products for a manufacturer
   */
  async getProducts(manufacturerId: string) {
    // Verify manufacturer exists
    await this.findOne(manufacturerId);

    return db
      .select()
      .from(products)
      .where(eq(products.manufacturerId, manufacturerId))
      .orderBy(desc(products.createdAt));
  }
}
