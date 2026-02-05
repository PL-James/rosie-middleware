import { Module } from '@nestjs/common';
import { ScanProgressGateway } from './scan-progress.gateway';

/**
 * WebSocket Module
 *
 * Provides real-time bidirectional communication between backend and frontend.
 * Currently used for scan progress updates.
 */
@Module({
  providers: [ScanProgressGateway],
  exports: [ScanProgressGateway],
})
export class WebSocketModule {}
