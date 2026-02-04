import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductAggregationService } from './product-aggregation.service';
import { ProductsController } from './products.controller';
import { ManufacturersModule } from '../manufacturers/manufacturers.module';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [ManufacturersModule, RepositoriesModule],
  providers: [ProductsService, ProductAggregationService],
  controllers: [ProductsController],
  exports: [ProductsService, ProductAggregationService],
})
export class ProductsModule {}
