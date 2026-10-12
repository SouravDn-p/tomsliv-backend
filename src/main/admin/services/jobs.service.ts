import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { GetFarmOwnerJobsDto } from '@/main/jobs/dto/get-jobs.dto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get jobs')
  async getJobs(dto: GetFarmOwnerJobsDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {};

    if (dto.status) {
      where.status = dto.status;
    } else {
      where.status = { not: 'PENDING_PAYMENT' };
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
          farm: {
            select: {
              name: true,
              users: {
                select: {
                  name: true,
                  email: true,
                },
              },
              logo: {
                select: {
                  url: true,
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
      }),
    ]);

    const transformedJobs = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      status: job.status,

      farmName: job.farm?.name ?? null,
      logUrl: job.farm?.logo?.url ?? null,
      employerName: job.farm?.users?.name ?? null,
      employerEmail: job.farm?.users?.email ?? null,

      totalApplications: job._count.jobApplications,

      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    return successPaginatedResponse(
      transformedJobs,
      {
        page,
        limit,
        total,
      },
      'Successfully found',
    );
  }

  @HandleError('Failed to get job')
  async getAdminSingleJob(jobId: string) {
    const job = await this.prisma.client.job.findUniqueOrThrow({
      where: { id: jobId },
      include: {
        farm: {
          select: {
            name: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: { select: { jobApplications: true } },
        jobApplications: {
          orderBy: { appliedAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            applicationAIResults: { select: { jobFitScore: true } },
          },
        },
      },
    });

    const employer = job.farm?.users ?? null;

    const applicants = job._count.jobApplications;
    const shortlisted = job.jobApplications.filter(
      (app) => app.status === 'SHORTLISTED',
    ).length;

    const scores = job.jobApplications
      .map((app) => app.applicationAIResults?.jobFitScore)
      .filter((score): score is number => score != null);

    const averageScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return successResponse(
      {
        ...job,

        farmName: job.farm?.name ?? null,
        employerId: employer?.id ?? null,
        employerName: employer?.name ?? null,
        employerEmail: employer?.email ?? null,

        // Farm-owner style stats
        views: job.viewCount,
        applicants,
        shortlisted,
        averageScore: parseFloat(averageScore.toFixed(2)),

        // Last 5 applications
        lastApplications: job.jobApplications.slice(0, 5).map((app) => ({
          applicationId: app.id,
          applicantId: app.user.id,
          applicantName: app.user.name,
          applicantEmail: app.user.email,
          status: app.status,
          appliedAt: app.appliedAt,
        })),

        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      'Admin job details fetched successfully',
    );
  }

  @HandleError('Failed to get job applications')
  async getAdminJobApplications(jobId: string, dt: PaginationDto) {
    const page = dt?.page && dt.page > 0 ? +dt.page : 1;
    const limit = dt?.limit && dt.limit > 0 ? +dt.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobApplicationWhereInput = {
      jobId,
    };

    const [total, applications] = await this.prisma.client.$transaction([
      this.prisma.client.jobApplication.count({ where }),
      this.prisma.client.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appliedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          cv: true,
        },
      }),
    ]);

    return successPaginatedResponse(
      applications.map((app) => ({
        applicationId: app.id,
        applicantId: app.user.id,
        applicantName: app.user.name,
        applicantEmail: app.user.email,
        status: app.status,
        appliedAt: app.appliedAt,
        cv: app.cv,
      })),
      {
        page,
        limit,
        total,
      },
      'Job application history fetched successfully',
    );
  }

  @HandleError('Failed to toggle job status')
  async toggleSuspendJob(jobId: string) {
    const job = await this.prisma.client.job.findUniqueOrThrow({
      where: { id: jobId },
    });

    if (job.status === 'SUSPENDED') {
      await this.prisma.client.job.update({
        where: { id: jobId },
        data: { status: 'ACTIVE' },
      });
    } else {
      await this.prisma.client.job.update({
        where: { id: jobId },
        data: { status: 'SUSPENDED' },
      });
    }

    return successResponse(null, 'Job status updated successfully');
  }
}
