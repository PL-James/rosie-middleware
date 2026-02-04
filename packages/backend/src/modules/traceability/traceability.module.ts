import { Module } from '@nestjs/common';
import { TraceabilityValidatorService } from './traceability-validator.service';
import { TraceabilityController } from './traceability.controller';

@Module({
  controllers: [TraceabilityController],
  providers: [TraceabilityValidatorService],
  exports: [TraceabilityValidatorService],
})
export class TraceabilityModule {}
