import type { EmailJob, EmailQueueStats, SendEmailOptions } from './email.types';

export type JobHandler = (options: SendEmailOptions) => Promise<void>;

/**
 * Lightweight, high-throughput in-memory asynchronous Email Worker Queue.
 *
 * Provides non-blocking background email dispatch with:
 * - Configurable concurrency (default: 3 concurrent workers)
 * - Exponential backoff retries for failed jobs (default: 3 attempts)
 * - Error isolation so background failures never crash request handlers
 * - Live queue statistics for health/observability
 */
export class EmailQueue {
  private queue: EmailJob[] = [];
  private activeJobs = 0;
  private scheduledRetries = 0;
  private retryTimers: NodeJS.Timeout[] = [];
  private concurrency: number;
  private handler: JobHandler | null = null;
  private isProcessing = false;
  private stats: EmailQueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0,
  };

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  /**
   * Register the worker job handler.
   */
  public setHandler(handler: JobHandler): void {
    this.handler = handler;
  }

  /**
   * Enqueue a new email job to be sent in the background.
   */
  public enqueue(options: SendEmailOptions, maxAttempts = 3): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: EmailJob = {
      id: jobId,
      options,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      status: 'pending',
    };

    this.queue.push(job);
    this.updateStats();
    this.triggerProcessing();

    return jobId;
  }

  /**
   * Get current queue statistics for observability.
   */
  public getStats(): EmailQueueStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Clear all pending jobs and active timers in the queue (useful in tests).
   */
  public clear(): void {
    for (const timer of this.retryTimers) {
      clearTimeout(timer);
    }
    this.retryTimers = [];
    this.scheduledRetries = 0;
    this.queue = [];
    this.activeJobs = 0;
    this.isProcessing = false;
    this.updateStats();
  }

  /**
   * Wait until all pending jobs, active workers, and scheduled retries have finished.
   */
  public async drain(): Promise<void> {
    while (this.queue.length > 0 || this.activeJobs > 0 || this.scheduledRetries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  private updateStats(): void {
    this.stats.pending = this.queue.filter((j) => j.status === 'pending').length;
    this.stats.processing = this.activeJobs;
  }

  private triggerProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    setImmediate(() => {
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (!this.handler) {
      this.isProcessing = false;
      return;
    }

    while (this.activeJobs < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      this.activeJobs++;
      job.status = 'processing';
      this.updateStats();

      // Execute job in background
      this.executeJob(job)
        .catch(() => {
          // Handled inside executeJob
        })
        .finally(() => {
          this.activeJobs--;
          this.updateStats();
          if (this.queue.length > 0) {
            this.processNext();
          } else if (this.activeJobs === 0) {
            this.isProcessing = false;
          }
        });
    }

    if (this.activeJobs === 0 && this.queue.length === 0) {
      this.isProcessing = false;
    }
  }

  private async executeJob(job: EmailJob): Promise<void> {
    job.attempts++;

    try {
      if (this.handler) {
        await this.handler(job.options);
      }
      job.status = 'completed';
      this.stats.completed++;
      this.stats.totalProcessed++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      job.error = errorMessage;

      if (job.attempts < job.maxAttempts) {
        // Fast exponential backoff for queue retries (50ms base)
        const backoffMs = Math.min(50 * Math.pow(2, job.attempts - 1), 3000);
        job.status = 'pending';
        this.scheduledRetries++;

        const timer = setTimeout(() => {
          this.scheduledRetries = Math.max(0, this.scheduledRetries - 1);
          const idx = this.retryTimers.indexOf(timer);
          if (idx !== -1) {
            this.retryTimers.splice(idx, 1);
          }

          this.queue.push(job);
          this.updateStats();
          this.triggerProcessing();
        }, backoffMs);

        this.retryTimers.push(timer);
      } else {
        job.status = 'failed';
        this.stats.failed++;
        this.stats.totalProcessed++;
        console.error(`[EmailQueue] Job ${job.id} failed after ${job.attempts} attempts:`, errorMessage);
      }
    }
  }
}
