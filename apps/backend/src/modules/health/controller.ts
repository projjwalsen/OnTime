import type { Request, Response } from 'express';
import { successResponse } from '../../utils/response';
import { emailService } from '../../lib/email.service';

/**
 * GET /api/v1/health
 *
 * Health check endpoint.
 * Returns operational metrics and service status.
 * Publicly accessible.
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const queueStats = emailService.getQueueStats();

  successResponse(res, 'API is running', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      emailQueue: queueStats,
    },
  });
}
