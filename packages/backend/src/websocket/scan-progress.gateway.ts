import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * WebSocket Gateway for real-time scan progress updates
 *
 * Enables push-based progress updates to frontend clients during repository scans,
 * eliminating the need for polling and providing better UX with real-time feedback.
 *
 * Event channels:
 * - scan:{scanId}:progress - Progress updates (0-100%)
 * - scan:{scanId}:complete - Scan completion with results
 * - scan:{scanId}:failed - Scan failure with error message
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/ws',
})
export class ScanProgressGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScanProgressGateway.name);

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit scan progress update
   *
   * @param scanId - Unique scan identifier
   * @param progress - Progress percentage (0-100)
   * @param status - Current scan status/phase
   * @param message - Optional descriptive message
   */
  emitScanProgress(
    scanId: string,
    progress: number,
    status: string,
    message?: string,
  ) {
    const payload = {
      scanId,
      progress,
      status,
      message,
      timestamp: new Date().toISOString(),
    };

    this.server.emit(`scan:${scanId}:progress`, payload);
    this.logger.debug(`Emitted progress for scan ${scanId}: ${progress}%`);
  }

  /**
   * Emit scan completion event
   *
   * @param scanId - Unique scan identifier
   * @param result - Scan result data
   */
  emitScanComplete(scanId: string, result: any) {
    const payload = {
      scanId,
      result,
      timestamp: new Date().toISOString(),
    };

    this.server.emit(`scan:${scanId}:complete`, payload);
    this.logger.log(`Emitted completion for scan ${scanId}`);
  }

  /**
   * Emit scan failure event
   *
   * @param scanId - Unique scan identifier
   * @param error - Error message
   */
  emitScanFailed(scanId: string, error: string) {
    const payload = {
      scanId,
      error,
      timestamp: new Date().toISOString(),
    };

    this.server.emit(`scan:${scanId}:failed`, payload);
    this.logger.warn(`Emitted failure for scan ${scanId}: ${error}`);
  }
}
