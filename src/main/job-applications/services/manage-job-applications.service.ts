import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma';
import { ManageApplicationStatusDto } from '../dto/manage-application-status.dto';

@Injectable()
export class ManageJobApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
  ) {}

  @HandleError('Failed to get application', 'JobApplication')
  async getApplication(
    userId: string,
    applicationId: string,
  ): Promise<TResponse<any>> {
    // 1. Verify ownership and fetch application
    const application =
      await this.prisma.client.jobApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          job: true,
          cv: {
            include: {
              customCV: true,
              customCoverLetter: true,
              educations: true,
              experiences: true,
              jobApplications: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profilePictureId: true,
              profilePicture: true,
            },
          },
          applicationAIResults: true,
        },
      });

    // Check if the job belongs to the user's (farm owner's) farm
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user?.farmId || application.job.farmId !== user.farmId) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        "You don't have permission to view this application",
      );
    }

    // 2. If status is NEW, update to REVIEWED
    if (application.status === ApplicationStatus.NEW) {
      const updatedApp = await this.prisma.client.jobApplication.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.REVIEWED },
        include: {
          job: true,
          cv: {
            include: {
              customCV: true,
              customCoverLetter: true,
              educations: true,
              experiences: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profilePictureId: true,
              profilePicture: true,
            },
          },
          applicationAIResults: true,
        },
      });
      return successResponse(updatedApp, 'Application details fetched');
    }

    return successResponse(application, 'Application details fetched');
  }

  @HandleError('Failed to update application status', 'JobApplication')
  async updateStatus(
    userId: string,
    applicationId: string,
    dto: ManageApplicationStatusDto,
  ): Promise<TResponse<any>> {
    // 1. Verify ownership
    const application =
      await this.prisma.client.jobApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: { job: true },
      });

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user?.farmId || application.job.farmId !== user.farmId) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        "You don't have permission to update this application",
      );
    }

    // 2. Update Status
    const updatedApp = await this.prisma.client.jobApplication.update({
      where: { id: applicationId },
      data: { status: dto.status },
    });

    // Send email to the user if the application is shortlisted
    if (dto.status === ApplicationStatus.SHORTLISTED) {
      await this.applicationAITrigger.triggerShortlistEmail(applicationId);
    }

    return successResponse(updatedApp, 'Application status updated');
  }

  @HandleError('Failed to toggle reject status', 'JobApplication')
  async toggleReject(
    userId: string,
    applicationId: string,
  ): Promise<TResponse<any>> {
    const application =
      await this.prisma.client.jobApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: { job: true },
      });

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user?.farmId || application.job.farmId !== user.farmId) {
      throw new AppError(HttpStatus.FORBIDDEN, "You don't have permission");
    }

    // Toggle logic
    const newStatus =
      application.status === ApplicationStatus.REJECTED
        ? ApplicationStatus.NEW
        : ApplicationStatus.REJECTED;

    const updated = await this.prisma.client.jobApplication.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });

    return successResponse(updated, 'Reject status toggled');
  }

  @HandleError('Failed to toggle shortlist status', 'JobApplication')
  async toggleShortlist(
    userId: string,
    applicationId: string,
  ): Promise<TResponse<any>> {
    const application =
      await this.prisma.client.jobApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: { job: true },
      });

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user?.farmId || application.job.farmId !== user.farmId) {
      throw new AppError(HttpStatus.FORBIDDEN, "You don't have permission");
    }

    // Toggle logic
    const newStatus =
      application.status === ApplicationStatus.SHORTLISTED
        ? ApplicationStatus.NEW
        : ApplicationStatus.SHORTLISTED;

    const updated = await this.prisma.client.jobApplication.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });

    // Send email only when switching TO shortlisted
    if (newStatus === ApplicationStatus.SHORTLISTED) {
      await this.applicationAITrigger.triggerShortlistEmail(applicationId);
    }

    return successResponse(updated, 'Shortlist status toggled');
  }
}
