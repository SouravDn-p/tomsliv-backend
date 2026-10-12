import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UpsertIdealCandidateDto } from '../dto/ideal-candidate.dto';

@Injectable()
export class IdealCandidateService {
  private readonly logger = new Logger(IdealCandidateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
  ) {}

  @HandleError('Failed to upsert ideal candidate', 'IdealCandidate')
  async upsertIdealCandidate(
    userId: string,
    jobId: string,
    dto: UpsertIdealCandidateDto,
  ): Promise<TResponse<any>> {
    // Verify job exists and belongs to user's farm
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      include: { farm: true },
    });

    if (!job) {
      throw new AppError(HttpStatus.NOT_FOUND, 'Job not found');
    }

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { farm: true },
    });

    const farm = user.farm;
    if (!farm) {
      this.logger.warn(`User with ID ${userId} has no associated farm.`);
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    if (job.farmId !== farm.id) {
      this.logger.warn(
        `User ${userId} attempted to manage ideal candidate for job ${jobId} from another farm`,
      );
      throw new AppError(
        HttpStatus.FORBIDDEN,
        'You can only manage ideal candidates for jobs from your own farm',
      );
    }

    // Upsert ideal candidate
    const idealCandidate = await this.prisma.client.idealCandidate.upsert({
      where: { jobId },
      create: {
        jobId,
        ...dto,
      },
      update: {
        ...dto,
      },
    });

    // Trigger AI analysis for all applications of this job
    await this.applicationAITrigger.triggerForIdealCandidateUpdate(jobId);

    return successResponse(
      idealCandidate,
      'Ideal candidate profile saved successfully',
    );
  }

  @HandleError('Failed to get ideal candidate', 'IdealCandidate')
  async getIdealCandidate(
    userId: string,
    jobId: string,
  ): Promise<TResponse<any>> {
    // Verify job exists and belongs to user's farm
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      include: { farm: true },
    });

    if (!job) {
      throw new AppError(HttpStatus.NOT_FOUND, 'Job not found');
    }

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { farm: true },
    });

    const farm = user.farm;
    if (!farm) {
      this.logger.warn(`User with ID ${userId} has no associated farm.`);
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    if (job.farmId !== farm.id) {
      this.logger.warn(
        `User ${userId} attempted to access ideal candidate for job ${jobId} from another farm`,
      );
      throw new AppError(
        HttpStatus.FORBIDDEN,
        'You can only view ideal candidates for jobs from your own farm',
      );
    }

    // Get ideal candidate
    const idealCandidate = await this.prisma.client.idealCandidate.findUnique({
      where: { jobId },
    });

    if (!idealCandidate) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        'No ideal candidate profile found for this job',
      );
    }

    return successResponse(
      idealCandidate,
      'Ideal candidate profile fetched successfully',
    );
  }
}
