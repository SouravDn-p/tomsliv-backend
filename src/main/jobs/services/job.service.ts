import {
  successPaginatedResponse,
  successResponse,
  TResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { StripeService } from '@/lib/stripe/stripe.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma';
import { PRICING_CONFIG } from '../constants/pricing.constants';
import { CreateJobDto } from '../dto/create-job.dto';
import { GetFarmOwnerJobsDto } from '../dto/get-jobs.dto';
import { ManageJobStatusDto } from '../dto/manage-job-status.dto';
import { UpdateJobDto } from '../dto/update-job.dto';

@Injectable()
export class JobService {
  // Pricing Rules (from constants)
  private readonly EARLY_ADOPTER_PRICE = PRICING_CONFIG.EARLY_ADOPTER_PRICE;
  private readonly NORMAL_PRICE = PRICING_CONFIG.NORMAL_PRICE;
  private readonly EARLY_ADOPTER_DISCOUNT_PERCENTAGE =
    PRICING_CONFIG.EARLY_ADOPTER_DISCOUNT_PERCENTAGE;
  private readonly EARLY_ADOPTER_DISCOUNT_USAGE_LIMIT =
    PRICING_CONFIG.EARLY_ADOPTER_DISCOUNT_USAGE_LIMIT;
  private readonly EARLY_ADOPTER_LIMIT = PRICING_CONFIG.EARLY_ADOPTER_LIMIT;

  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
    private readonly stripeService: StripeService,
  ) {}

  @HandleError('Failed to create job', 'Job')
  async createJob(userId: string, dto: CreateJobDto): Promise<TResponse<any>> {
    // Pricing Logic Execution in Transaction
    const result = await this.prisma.client.$transaction(async (tx) => {
      // 1. Fetch User & Farm
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { farm: true },
      });

      const farm = user.farm;
      if (!farm) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          'User has no associated farm',
        );
      }

      if (farm.status === 'INACTIVE') {
        throw new AppError(HttpStatus.BAD_REQUEST, 'Farm is inactive');
      }

      // 2. Calculate Price based on Status
      let price = this.NORMAL_PRICE;
      const isEarlyAdopter = user.isEarlyAdopter;
      const earlyAdopterDiscountUsage = user.earlyAdopterDiscountUsage;

      if (isEarlyAdopter) {
        // Usage 0: First advert -> $150
        if (earlyAdopterDiscountUsage === 0) {
          price = this.EARLY_ADOPTER_PRICE; // $150
        }
        // Usage 1, 2, 3: Next 3 adverts -> 20% OFF ($200)
        else if (
          earlyAdopterDiscountUsage <= this.EARLY_ADOPTER_DISCOUNT_USAGE_LIMIT
        ) {
          price =
            this.NORMAL_PRICE * (1 - this.EARLY_ADOPTER_DISCOUNT_PERCENTAGE); // 250 - 20% = 200
        }
        // Usage 4+: Normal Price ($250) - (Default)
      }

      // 3. User Status Update Moved to Webhook (on success)

      // 4. Create Job with PENDING_PAYMENT status
      const job = await tx.job.create({
        data: {
          ...dto,
          farmId: farm.id,
          status: 'PENDING_PAYMENT',
          pricePaid: price,
        },
      });

      return {
        job,
        price,
        isNewEarlyAdopter: user.isEarlyAdopter,
        farmName: farm.name,
        userEmail: user.email,
        userName: user.name,
      };
    });

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: Math.round(result.price * 100), // Convert to cents
      currency: 'nzd',
      customerId: await this.stripeService
        .getOrCreateCustomerId({
          userId,
          email: result.userEmail,
          name: result.userName,
        })
        .then((c: any) => c.id),
      metadata: {
        userId,
        email: result.userEmail,
        name: result.userName,
        planId: 'job-advert-one-time', // Placeholder
        planTitle: 'Job Advert',
        stripeProductId: 'job-advert', // Placeholder
        jobId: result.job.id,
        jobTitle: result.job.title,
      },
    });

    return successResponse(
      {
        ...result.job,
        clientSecret: paymentIntent.client_secret,
        pricing: {
          pricePaid: result.price,
          currency: 'USD',
          isEarlyAdopter:
            result.isNewEarlyAdopter ||
            (await this.prisma.client.user
              .findUnique({ where: { id: userId } })
              .then((u) => u?.isEarlyAdopter)),
        },
      },
      'Job created. Payment required to publish.',
    );
  }

  @HandleError('Failed to update job', 'Job')
  async updateJob(
    userId: string,
    jobId: string,
    dto: UpdateJobDto,
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
        `User ${userId} attempted to update job ${jobId} from another farm`,
      );
      throw new AppError(
        HttpStatus.FORBIDDEN,
        'You can only update jobs from your own farm',
      );
    }

    // Build update job data
    const updateData: Prisma.JobUpdateInput = {
      title: dto.title ? dto.title.trim() : job.title,
      description: dto.description ? dto.description.trim() : job.description,
      benefits: dto.benefits ? dto.benefits.trim() : job.benefits,
      farmSize: dto.farmSize ?? job.farmSize,
      herdSize: dto.herdSize ?? job.herdSize,
      onFarmStaff: dto.onFarmStaff ?? job.onFarmStaff,
      location: dto.location ? dto.location.trim() : job.location,
      jobType: dto.jobType ?? job.jobType,
      role: dto.role ? dto.role.trim() : job.role,
      numberOfPositions: dto.numberOfPositions ?? job.numberOfPositions,
      requiredExperience: dto.requiredExperience ?? job.requiredExperience,
      applicationDeadline: dto.applicationDeadline ?? job.applicationDeadline,
      positionStartDate: dto.positionStartDate ?? job.positionStartDate,
      // hourType: dto.hourType ?? job.hourType,
      hoursPerWeek: dto.hoursPerWeek ?? job.hoursPerWeek,
      roster: dto.roster ? dto.roster.trim() : job.roster,
      remunerationPaidBy: dto.remunerationPaidBy
        ? dto.remunerationPaidBy.trim()
        : job.remunerationPaidBy,
      remunerationType: dto.remunerationType ?? job.remunerationType,
      remunerationStart: dto.remunerationStart ?? job.remunerationStart,
      remunerationEnd: dto.remunerationEnd ?? job.remunerationEnd,
      totalPackageValue: dto.totalPackageValue ?? job.totalPackageValue,
      perKgMSDollarValue: dto.perKgMSDollarValue ?? job.perKgMSDollarValue,
      percentageOfMilkCheque:
        dto.percentageOfMilkCheque ?? job.percentageOfMilkCheque,
    };

    // Update the job
    const updatedJob = await this.prisma.client.job.update({
      where: { id: jobId },
      data: updateData,
    });

    // Trigger AI analysis for all applications of this job
    await this.applicationAITrigger.triggerForJobUpdate(jobId);

    return successResponse(updatedJob, 'Job updated successfully');
  }

  @HandleError('Failed to manage job status', 'Job')
  async manageStatus(
    userId: string,
    jobId: string,
    dto: ManageJobStatusDto,
  ): Promise<TResponse<any>> {
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new AppError(HttpStatus.NOT_FOUND, 'Job not found');
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { farm: true },
    });

    if (!user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'User not found');
    }

    // allow ADMIN or owner of the farm to change status
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    const isOwnerOfFarm = !!user.farm && user.farm.id === job.farmId;

    if (!isAdmin && !isOwnerOfFarm) {
      this.logger.warn(
        `User ${userId} attempted to change status of job ${jobId} without permission`,
      );
      throw new AppError(
        HttpStatus.FORBIDDEN,
        'Not authorized to change job status',
      );
    }

    const updated = await this.prisma.client.job.update({
      where: { id: jobId },
      data: {
        status: dto.status,
      },
    });

    // Trigger AI analysis for all applications of this job
    await this.applicationAITrigger.triggerForJobUpdate(jobId);

    return successResponse(updated, `Job status updated to ${dto.status}`);
  }

  @HandleError('Failed to get farm owner jobs', 'Job')
  async getFarmOwnerJobs(userId: string, dto: GetFarmOwnerJobsDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { farm: true },
    });

    const farm = user.farm;
    if (!farm) {
      this.logger.warn(`User with ID ${userId} has no associated farm.`);
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    const where: Prisma.JobWhereInput = { farmId: farm.id };

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.search) {
      where.OR = [
        { title: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { location: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [total, jobs] = await this.prisma.client.$transaction([
      this.prisma.client.job.count({ where }),
      this.prisma.client.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              jobApplications: true,
            },
          },
          jobApplications: {
            select: {
              status: true,
              applicationAIResults: {
                select: {
                  jobFitScore: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const jobsWithStats = jobs.map((job) => {
      const applicants = job._count.jobApplications;
      const shortlisted = job.jobApplications.filter(
        (app) => app.status === 'SHORTLISTED',
      ).length;

      const scores = job.jobApplications
        .map((app) => app.applicationAIResults?.jobFitScore)
        .filter(
          (score): score is number => score !== undefined && score !== null,
        );

      const averageScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      // Remove jobApplications from the response object to keep it clean
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { jobApplications, ...jobData } = job;

      return {
        ...jobData,
        views: job.viewCount,
        applicants,
        shortlisted,
        averageScore: parseFloat(averageScore.toFixed(2)),
      };
    });

    return successPaginatedResponse(
      jobsWithStats,
      {
        page,
        limit,
        total,
      },
      'Jobs fetched successfully',
    );
  }

  @HandleError('Failed to get job details', 'Job')
  async getSingleJob(jobId: string): Promise<TResponse<any>> {
    const job = await this.prisma.client.job.update({
      where: { id: jobId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      include: {
        farm: true,
        idealCandidates: true,
        jobApplications: {
          select: {
            status: true,
            applicationAIResults: {
              select: {
                jobFitScore: true,
              },
            },
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    const applicants = job._count.jobApplications;
    const shortlisted = job.jobApplications.filter(
      (app) => app.status === 'SHORTLISTED',
    ).length;

    const scores = job.jobApplications
      .map((app) => app.applicationAIResults?.jobFitScore)
      .filter(
        (score): score is number => score !== undefined && score !== null,
      );

    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Remove jobApplications from the response object to keep it clean
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { jobApplications, ...jobData } = job;

    const jobWithStats = {
      ...jobData,
      views: job.viewCount,
      applicants,
      shortlisted,
      averageScore: parseFloat(averageScore.toFixed(2)),
    };

    return successResponse(
      jobWithStats,
      'Job details fetched successfully with stats',
    );
  }

  @HandleError('Failed to check introduction offer availability', 'Job')
  async checkIntroductionOfferAvailability(): Promise<TResponse<any>> {
    const currentEarlyAdopters = await this.prisma.client.user.count({
      where: { isEarlyAdopter: true },
    });

    const isAvailable = currentEarlyAdopters < this.EARLY_ADOPTER_LIMIT;

    return successResponse(
      {
        isAvailable,
        totalLimit: this.EARLY_ADOPTER_LIMIT,
        currentCount: currentEarlyAdopters,
        offerDetails: {
          introductoryPrice: this.EARLY_ADOPTER_PRICE,
          normalPrice: this.NORMAL_PRICE,
          discountPercentage: this.EARLY_ADOPTER_DISCOUNT_PERCENTAGE * 100,
          discountUsageLimit: this.EARLY_ADOPTER_DISCOUNT_USAGE_LIMIT,
          description: `The first ${this.EARLY_ADOPTER_LIMIT} farmers to register get their first job advert for only $${this.EARLY_ADOPTER_PRICE}. Following that, they get a ${this.EARLY_ADOPTER_DISCOUNT_PERCENTAGE * 100}% discount on their next ${this.EARLY_ADOPTER_DISCOUNT_USAGE_LIMIT} job adverts.`,
        },
      },
      'Introduction offer availability checked successfully',
    );
  }
}
