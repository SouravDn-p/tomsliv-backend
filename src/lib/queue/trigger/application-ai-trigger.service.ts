import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationAIPayload } from '../interface/application-ai.payload';

@Injectable()
export class ApplicationAITriggerService {
  private readonly logger = new Logger(ApplicationAITriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generic method to trigger AI analysis for a specific application
   */
  async triggerAIAnalysis(
    applicationId: string,
    reason: ApplicationAIPayload['triggerReason'],
  ) {
    try {
      const application = await this.prisma.client.jobApplication.findUnique({
        where: { id: applicationId },
        include: {
          job: {
            include: {
              idealCandidates: true,
            },
          },
        },
      });

      if (!application) {
        this.logger.warn(
          `Application ${applicationId} not found, skipping AI analysis`,
        );
        return;
      }

      const payload: ApplicationAIPayload = {
        applicationId: application.id,
        jobId: application.jobId,
        cvId: application.cvId,
        idealCandidateId: application.job.idealCandidates?.id,
        triggerReason: reason,
      };

      await this.eventEmitter.emitAsync(
        QueueEventsEnum.APPLICATION_AI_ANALYSIS,
        payload,
      );

      this.logger.log(
        `Triggered AI analysis for application ${applicationId}, reason: ${reason}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to trigger AI analysis for application ${applicationId}`,
        err,
      );
    }
  }

  /**
   * Trigger AI analysis for all applications of a specific job
   */
  async triggerForJobUpdate(jobId: string) {
    try {
      const applications = await this.prisma.client.jobApplication.findMany({
        where: { jobId },
      });

      this.logger.log(
        `Triggering AI analysis for ${applications.length} applications of job ${jobId}`,
      );

      for (const application of applications) {
        await this.triggerAIAnalysis(application.id, 'job-updated');
      }
    } catch (err) {
      this.logger.error(
        `Failed to trigger AI analysis for job ${jobId} applications`,
        err,
      );
    }
  }

  /**
   * Trigger AI analysis for all applications using a specific CV
   */
  async triggerForCVUpdate(cvId: string) {
    try {
      const applications = await this.prisma.client.jobApplication.findMany({
        where: { cvId },
      });

      this.logger.log(
        `Triggering AI analysis for ${applications.length} applications using CV ${cvId}`,
      );

      for (const application of applications) {
        await this.triggerAIAnalysis(application.id, 'cv-updated');
      }
    } catch (err) {
      this.logger.error(
        `Failed to trigger AI analysis for CV ${cvId} applications`,
        err,
      );
    }
  }

  /**
   * Trigger AI analysis for all applications of a job when ideal candidate is updated
   */
  async triggerForIdealCandidateUpdate(jobId: string) {
    try {
      const applications = await this.prisma.client.jobApplication.findMany({
        where: { jobId },
      });

      this.logger.log(
        `Triggering AI analysis for ${applications.length} applications due to ideal candidate update for job ${jobId}`,
      );

      for (const application of applications) {
        await this.triggerAIAnalysis(application.id, 'ideal-candidate-updated');
      }
    } catch (err) {
      this.logger.error(
        `Failed to trigger AI analysis for ideal candidate update on job ${jobId}`,
        err,
      );
    }
  }

  /**
   * Trigger email generation for shortlisted application
   */
  async triggerShortlistEmail(applicationId: string) {
    await this.triggerAIAnalysis(applicationId, 'application-shortlisted');
  }
}
