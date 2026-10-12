import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import {
  successPaginatedResponse,
  successResponse,
  TResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { QueuePayload } from '@/lib/queue/interface/queue.payload';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { CreateCvBodyDto } from '@/main/cv/dto/create-cv.dto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OtpType, UserRole, UserStatus } from '@prisma';
import {
  AppliedJobSortOptionEnum,
  GetAppliedJobsDto,
} from '../dto/get-applied-jobs.dto';
import { PublicApplyDto } from '../dto/public-apply.dto';

@Injectable()
export class JobApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
    private readonly authUtils: AuthUtilsService,
    private readonly authMail: AuthMailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async notifyJobOwner(jobId: string, applicantName: string) {
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: {
        title: true,
        farm: {
          select: {
            users: {
              select: {
                id: true,
                notificationSettings: true,
              },
            },
          },
        },
      },
    });

    if (!job || !job.farm?.users) return;

    const owner = job.farm.users;
    if (owner.notificationSettings?.newApplicantAlert) {
      const payload: QueuePayload = {
        recipients: [{ id: owner.id }],
        type: QueueEventsEnum.NOTIFICATION,
        title: 'New Job Application',
        message: `${applicantName} has applied for ${job.title}`,
        createdAt: new Date(),
        meta: {
          performedBy: 'system',
          recordType: 'JobApplication',
          recordId: jobId,
        },
      };

      await this.eventEmitter.emitAsync(QueueEventsEnum.NOTIFICATION, payload);
    }
  }

  @HandleError('Failed to apply (Public)', 'JobApplication')
  async applyPublic(
    jobId: string,
    dto: PublicApplyDto,
  ): Promise<TResponse<any>> {
    const email = dto.coreInfo.email;
    let userId: string;
    let isNewUser = false;
    let tempPassword = '';

    // 1. Check if user exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // 2. Create new user
      isNewUser = true;
      // Generate random password
      tempPassword = Math.random().toString(36).slice(-10); // 10 chars
      const hashedPassword = await this.authUtils.hash(tempPassword);

      const newUser = await this.prisma.client.user.create({
        data: {
          email,
          name: `${dto.coreInfo.firstName} ${dto.coreInfo.lastName}`,
          role: UserRole.USER,
          password: hashedPassword,
          status: UserStatus.ACTIVE,
          isVerified: true,
          notificationSettings: {
            create: {},
          },
        },
      });
      userId = newUser.id;
    }

    // 3. Apply
    await this.applyWithNewCv(userId, dto, jobId);

    // 4. Send Email
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: { title: true },
    });
    const jobTitle = job?.title || 'Job Application';

    if (isNewUser) {
      // Generate standard OTP for password reset/setup
      const otp = await this.authUtils.generateOTPAndSave(
        userId,
        OtpType.RESET,
      );
      await this.authMail.sendWelcomeGuestEmail(email, otp.toString());
    } else {
      // Optional: Send "Application Received" email for existing users
      await this.authMail.sendApplicationReceivedEmail(
        email,
        `${dto.coreInfo.firstName} ${dto.coreInfo.lastName}`,
        jobTitle,
        true,
      );
    }

    // Notify Job Owner
    await this.notifyJobOwner(
      jobId,
      `${dto.coreInfo.firstName} ${dto.coreInfo.lastName}`,
    );

    return successResponse(
      { userId, isNewUser },
      'Application submitted successfully',
    );
  }

  @HandleError('Failed to apply with saved CV', 'JobApplication')
  async applyWithSavedCv(
    userId: string,
    jobId: string,
  ): Promise<TResponse<any>> {
    // 1. Check if user has a saved CV
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { savedCVId: true },
    });

    if (!user || !user.savedCVId) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'No saved CV found for user');
    }

    // 2. Check if already applied
    const existingApplication =
      await this.prisma.client.jobApplication.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

    if (existingApplication) {
      throw new AppError(HttpStatus.CONFLICT, 'Already applied to this job');
    }

    // 3. Create Application
    const application = await this.prisma.client.jobApplication.create({
      data: {
        userId,
        jobId,
        cvId: user.savedCVId,
        isAppliedWithSavedCV: true,
      },
    });

    // Trigger AI analysis for this new application
    await this.applicationAITrigger.triggerAIAnalysis(
      application.id,
      'new-application',
    );

    // Get user details for notification
    const applicant = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (applicant) {
      // Notify Job Owner
      await this.notifyJobOwner(jobId, applicant.name);
    }

    return successResponse(application, 'Applied successfully with saved CV');
  }

  @HandleError('Failed to apply with new CV', 'JobApplication')
  async applyWithNewCv(
    userId: string,
    dto: CreateCvBodyDto,
    jobId: string,
  ): Promise<TResponse<any>> {
    // 1. Check if already applied
    const existingApplication =
      await this.prisma.client.jobApplication.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

    if (existingApplication) {
      throw new AppError(HttpStatus.CONFLICT, 'Already applied to this job');
    }

    // If fileId is provided check its existence
    if (dto.fileId) {
      const file = await this.prisma.client.fileInstance.findUnique({
        where: { id: dto.fileId },
      });

      if (!file) {
        throw new AppError(HttpStatus.NOT_FOUND, 'CV file not found');
      }
    }

    // If coverLetterFileId is provided check its existence
    if (dto.coverLetterFileId) {
      const file = await this.prisma.client.fileInstance.findUnique({
        where: { id: dto.coverLetterFileId },
      });

      if (!file) {
        throw new AppError(HttpStatus.NOT_FOUND, 'Cover letter file not found');
      }
    }

    // 2. Create new CV (not saving to user profile, just for this application)
    // Structure similar to CvService but create-only
    const cv = await this.prisma.client.cV.create({
      data: {
        firstName: dto.coreInfo.firstName,
        lastName: dto.coreInfo.lastName,
        email: dto.coreInfo.email,
        phone: dto.coreInfo.phone,
        location: dto.coreInfo.location,
        summary: dto.coreInfo.summary,
        jobTitle: dto.coreInfo.jobTitle,
        jobType: dto.coreInfo.jobType,
        availability: dto.coreInfo.availability,
        hasDrivingLicense: dto.coreInfo.hasDrivingLicense,
        eligibleToWorkInNZ: dto.coreInfo.eligibleToWorkInNZ,
        workPermitType: dto.coreInfo.workPermitType,
        isSaved: false,
        user: { connect: { id: userId } },
        ...(dto.fileId && {
          customCV: {
            connect: { id: dto.fileId },
          },
        }),
        ...(dto.coverLetterFileId && {
          customCoverLetter: {
            connect: { id: dto.coverLetterFileId },
          },
        }),
        experiences: {
          create: dto.experiences?.map((exp) => ({
            jobTitle: exp.jobTitle,
            jobType: exp.jobType,
            company: exp.company,
            summary: exp.summary,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isOngoing: exp.isOngoing,
          })),
        },
        educations: {
          create: dto.educations?.map((edu) => ({
            degree: edu.degree,
            institution: edu.institution,
            startDate: edu.startDate,
            endDate: edu.endDate,
            isOngoing: edu.isOngoing,
          })),
        },
      },
    });

    // 3. Create Application linked to this new CV
    const application = await this.prisma.client.jobApplication.create({
      data: {
        user: { connect: { id: userId } },
        job: { connect: { id: jobId } },
        cv: { connect: { id: cv.id } },
        isAppliedWithSavedCV: false,
        applicationAIResults: {
          create: {
            motivation: '',
            jobFitScore: 0,
            keyTraits: [],
            summary: '',
            areasOfImprovement: [],
            strengths: [],
          },
        },
      },
    });

    // Trigger AI analysis for this new application
    await this.applicationAITrigger.triggerAIAnalysis(
      application.id,
      'new-application',
    );

    // Notify Job Owner
    await this.notifyJobOwner(
      jobId,
      `${dto.coreInfo.firstName} ${dto.coreInfo.lastName}`,
    );

    return successResponse(application, 'Applied successfully with new CV');
  }

  @HandleError('Failed to get applied jobs', 'JobApplication')
  async getAppliedJobs(userId: string, dto: GetAppliedJobsDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (dto.search) {
      where.job = {
        OR: [
          { title: { contains: dto.search, mode: 'insensitive' } },
          { description: { contains: dto.search, mode: 'insensitive' } },
        ],
      };
    }

    let orderBy: any = { appliedAt: 'desc' };

    if (dto.sortOption) {
      switch (dto.sortOption) {
        case AppliedJobSortOptionEnum.MOST_RECENT:
          orderBy = { appliedAt: 'desc' };
          break;
        case AppliedJobSortOptionEnum.FIT_SCORE_HIGH_TO_LOW:
          orderBy = { applicationAIResults: { jobFitScore: 'desc' } };
          break;
        case AppliedJobSortOptionEnum.FIT_SCORE_LOW_TO_HIGH:
          orderBy = { applicationAIResults: { jobFitScore: 'asc' } };
          break;
        case AppliedJobSortOptionEnum.EXPERIENCE_HIGH_TO_LOW:
          orderBy = { job: { requiredExperience: 'desc' } };
          break;
        case AppliedJobSortOptionEnum.EXPERIENCE_LOW_TO_HIGH:
          orderBy = { job: { requiredExperience: 'asc' } };
          break;
      }
    }

    const [total, applications] = await this.prisma.client.$transaction([
      this.prisma.client.jobApplication.count({ where }),
      this.prisma.client.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          job: {
            include: {
              farm: true,
              _count: { select: { jobApplications: true } },
            },
          },
          applicationAIResults: true,
        },
      }),
    ]);

    return successPaginatedResponse(
      applications,
      {
        page,
        limit,
        total,
      },
      'Applied jobs fetched successfully',
    );
  }
}
