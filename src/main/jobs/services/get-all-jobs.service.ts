import { successPaginatedResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma';
import { QueryMode } from 'prisma/generated/internal/prismaNamespace';
import { GetAllJobsDto, JobSortOptionEnum } from '../dto/get-jobs.dto';

@Injectable()
export class GetAllJobsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get all jobs')
  async getAllJobs(query: GetAllJobsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const {
      jobTypes,
      roles,
      locations,
      remunerationRange,
      search,
      status,
      sortOption,
    } = query;

    // ---------------- Filters ----------------
    const andFilters: Prisma.JobWhereInput[] = [];

    if (status) {
      andFilters.push({ status });
    } else {
      andFilters.push({
        status: { notIn: ['SUSPENDED', 'PENDING_PAYMENT', 'CLOSED', 'PAUSED'] },
      });
    }

    if (jobTypes?.length) {
      andFilters.push({ jobType: { in: jobTypes } });
    }

    if (roles?.length) {
      andFilters.push({
        OR: roles.map((role) => ({
          role: { equals: role, mode: QueryMode.insensitive },
        })),
      });
    }

    if (locations?.length) {
      andFilters.push({
        OR: locations.map((loc) => ({
          location: { equals: loc, mode: QueryMode.insensitive },
        })),
      });
    }

    if (remunerationRange?.length) {
      andFilters.push({
        OR: remunerationRange.map((r) => ({
          remunerationStart: { gte: r.min, lte: r.max },
        })),
      });
    }

    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search, mode: QueryMode.insensitive } },
          { description: { contains: search, mode: QueryMode.insensitive } },
          { role: { contains: search, mode: QueryMode.insensitive } },
          { location: { contains: search, mode: QueryMode.insensitive } },
        ],
      });
    }

    const where: Prisma.JobWhereInput = { AND: andFilters };

    // ---------------- Sorting ----------------
    let orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: 'desc' }; // default

    if (sortOption) {
      switch (sortOption) {
        case JobSortOptionEnum.MOST_RECENT:
          orderBy = { createdAt: 'desc' };
          break;
        case JobSortOptionEnum.REMUNERATION_HIGH_TO_LOW:
          orderBy = { remunerationStart: 'desc' };
          break;
        case JobSortOptionEnum.REMUNERATION_LOW_TO_HIGH:
          orderBy = { remunerationStart: 'asc' };
          break;
        case JobSortOptionEnum.DEADLINE_SOON:
          orderBy = { applicationDeadline: 'asc' };
          break;
      }
    }

    // ---------------- Fetch jobs ----------------
    const [jobs, total] = await this.prisma.client.$transaction([
      this.prisma.client.job.findMany({
        where,
        include: { farm: { include: { logo: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.client.job.count({ where }),
    ]);

    return successPaginatedResponse(jobs, { page, limit, total }, 'Jobs found');
  }
}
