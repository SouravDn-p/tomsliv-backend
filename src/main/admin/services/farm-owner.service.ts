import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { FarmStatus, Prisma } from '@prisma';
import { GetAllFarmDto } from '../dto/get-farm.dto';

@Injectable()
export class FarmOwnerService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Farm status updated successfully')
  async getAllFarmOwner(dto: GetAllFarmDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.FarmWhereInput = {};

    if (dto.status) where.status = dto.status as FarmStatus;
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { location: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [farms, total] = await Promise.all([
      this.prisma.client.farm.findMany({
        include: {
          users: { select: { name: true, email: true } },
          jobs: true,
          logo: true,
        },
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.farm.count({ where }),
    ]);

    const transformed = farms.map((farm) => ({
      id: farm.id,
      farmName: farm.name,
      farmLogo: farm.logo?.url ?? null,
      location: farm.location ?? null,
      employeeName: farm.users?.name ?? null,
      employeeEmail: farm.users?.email ?? null,
      status: farm.status,
      totalJobsPosted: farm.jobs?.length ?? 0,
      totalActiveJobs:
        farm.jobs?.filter((j) => j.status === 'ACTIVE').length ?? 0,
      createdAt: farm.createdAt,
      updatedAt: farm.updatedAt,
    }));

    return successPaginatedResponse(
      transformed,
      {
        page,
        limit,
        total,
      },
      'Farms fetched successfully',
    );
  }

  @HandleError('Failed to fetch farm details')
  async getFarmDetails(id: string) {
    const farm = await this.prisma.client.farm.findUniqueOrThrow({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true } },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: {
            _count: { select: { jobApplications: true } },
            jobApplications: {
              select: {
                status: true,
                applicationAIResults: { select: { jobFitScore: true } },
              },
            },
          },
        },
        _count: { select: { jobs: true } },
      },
    });

    const recentActiveJobs = farm.jobs.filter((j) => j.status === 'ACTIVE');
    const recentPreviousJobs = farm.jobs.filter((j) => j.status !== 'ACTIVE');

    const mapJobStats = (jobs: typeof farm.jobs) =>
      jobs.map((job) => {
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

        return {
          id: job.id,
          title: job.title,
          status: job.status,
          createdAt: job.createdAt,
          views: job.viewCount,
          applicants,
          shortlisted,
          averageScore: parseFloat(averageScore.toFixed(2)),
        };
      });

    const employer = farm.users ?? null;

    return successResponse(
      {
        id: farm.id,
        farmName: farm.name,
        farmLogo: farm.logoId ?? null,
        location: farm.location ?? null,
        employeeId: employer?.id ?? null,
        employeeName: employer?.name ?? null,
        employeeEmail: employer?.email ?? null,
        totalJobs: farm._count.jobs,
        status: farm.status,
        totalActiveJobs: recentActiveJobs.length,
        recentActiveJobs: mapJobStats(recentActiveJobs),
        recentPreviousJobs: mapJobStats(recentPreviousJobs),
        createdAt: farm.createdAt,
        updatedAt: farm.updatedAt,
      },
      'Farm details fetched successfully',
    );
  }

  @HandleError('Farm status updated successfully')
  async toggleFarmOwnerSuspend(id: string) {
    const farm = await this.prisma.client.farm.findUniqueOrThrow({
      where: { id },
    });

    if (farm.status === 'INACTIVE') {
      await this.prisma.client.farm.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
    } else {
      await this.prisma.client.farm.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
    }

    return successResponse(null, 'Farm status updated successfully');
  }
}
