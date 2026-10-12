import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
  TResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { JobType } from '@prisma';

@Injectable()
export class GetAllJobsStatsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Job Type ----------------
  @HandleError('Failed to get job types with counts', 'Jobs')
  async getJobTypesWithCounts(): Promise<TResponse<any>> {
    const counts = await this.prisma.client.job.groupBy({
      by: ['jobType'],
      where: {
        status: { notIn: ['SUSPENDED', 'PENDING_PAYMENT', 'CLOSED', 'PAUSED'] },
      },
      _count: { jobType: true },
    });

    const map = Object.fromEntries(
      counts.map((c) => [c.jobType, c._count.jobType]),
    );

    // ONLY the required job types
    const orderedTypes = [
      JobType.FULL_TIME,
      JobType.PART_TIME,
      JobType.SEASONAL,
      JobType.CONTRACT,
      JobType.CASUAL,
    ];

    const jobTypes = orderedTypes.map((t) => {
      const count = map[t] ?? 0;
      return {
        type: t,
        label: `${this.jobTypeLabels[t]} (${count})`,
        count,
      };
    });

    return successResponse(
      jobTypes,
      'Fetched job types with counts successfully',
    );
  }

  // ---------------- Remuneration Buckets ----------------
  @HandleError('Failed to get remuneration buckets', 'Jobs')
  async getRemunerationBuckets(): Promise<TResponse<any>> {
    const jobs = await this.prisma.client.job.findMany({
      select: { remunerationStart: true },
      where: {
        remunerationStart: { not: null },
        status: { notIn: ['SUSPENDED', 'PENDING_PAYMENT', 'CLOSED', 'PAUSED'] },
      },
    });

    const buckets = this.remunerationBuckets.map((bucket) => {
      const count = jobs.filter(
        (j) =>
          j.remunerationStart! >= bucket.min &&
          j.remunerationStart! <= bucket.max,
      ).length;

      const rangeLabel =
        bucket.max === Infinity
          ? `${this.formatRemuneration(bucket.min)}+`
          : `${this.formatRemuneration(bucket.min)} - ${this.formatRemuneration(bucket.max)}`;

      return {
        range:
          bucket.max === Infinity
            ? `${bucket.min}+`
            : `${bucket.min}-${bucket.max}`,
        count,
        label: `${rangeLabel} (${count})`,
      };
    });

    return successResponse(
      buckets,
      'Fetched jobs remuneration buckets successfully',
    );
  }

  // ---------------- Job Roles ----------------
  @HandleError('Failed to get job roles with counts', 'Jobs')
  async getJobRolesWithCounts(pg: PaginationDto): Promise<TResponse<any>> {
    const page = pg.page && pg.page > 0 ? pg.page : 1;
    const limit = pg.limit && pg.limit > 0 ? pg.limit : 10;
    const skip = (page - 1) * limit;

    const counts = await this.prisma.client.job.groupBy({
      by: ['role'],
      where: {
        status: { notIn: ['SUSPENDED', 'PENDING_PAYMENT', 'CLOSED', 'PAUSED'] },
      },
      _count: { role: true },
    });

    // Case-insensitive exact match grouping
    const roleMap: Record<string, number> = {};
    for (const item of counts) {
      if (!item.role) continue;
      const roleLower = item.role.trim().toLowerCase();
      // Use the first occurrence's casing as the label or just capitalize
      roleMap[roleLower] = (roleMap[roleLower] || 0) + item._count.role;
    }

    const roles = Object.entries(roleMap).map(([role, count]) => ({
      role: role,
      count: count,
      label: `${role.charAt(0).toUpperCase() + role.slice(1)} (${count})`,
    }));

    const paginatedRoles = roles.slice(skip, skip + limit);

    return successPaginatedResponse(
      paginatedRoles,
      {
        page,
        limit,
        total: roles.length,
      },
      'Fetched job roles with counts successfully',
    );
  }

  // ---------------- Locations ----------------
  @HandleError('Failed to get job locations with counts', 'Jobs')
  async getJobRegionsWithCounts(pg: PaginationDto): Promise<TResponse<any>> {
    const page = pg.page && pg.page > 0 ? pg.page : 1;
    const limit = pg.limit && pg.limit > 0 ? pg.limit : 20;
    const skip = (page - 1) * limit;

    const regionCounts = await this.prisma.client.job.groupBy({
      by: ['location'],
      where: {
        status: { notIn: ['SUSPENDED', 'PENDING_PAYMENT', 'CLOSED', 'PAUSED'] },
      },
      _count: { location: true },
    });

    // Normalize NZ regions
    const regionLookup = this.nzRegions.reduce(
      (acc, region) => {
        acc[region.toLowerCase()] = region;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Build aggregated counts (case-insensitive exact match only)
    const countMap: Record<string, number> = {};

    for (const item of regionCounts) {
      if (!item.location) continue;

      const regionLower = item.location.toLowerCase();

      // CASE-INSENSITIVE EXACT MATCH ONLY
      const correctName = regionLookup[regionLower];
      if (correctName) {
        countMap[correctName] =
          (countMap[correctName] ?? 0) + item._count.location;
      }
    }

    // Final region list
    const regionList = this.nzRegions.map((region) => ({
      region,
      count: countMap[region] ?? 0,
      label: `${region} (${countMap[region] ?? 0})`,
    }));

    const paginated = regionList.slice(skip, skip + limit);

    return successPaginatedResponse(
      paginated,
      {
        page,
        limit,
        total: regionList.length,
      },
      'Fetched job regions with counts successfully',
    );
  }

  // ---------------- Helpers ----------------
  private readonly jobTypeLabels: Partial<Record<JobType, string>> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    SEASONAL: 'Seasonal',
    CONTRACT: 'Contract',
    CASUAL: 'Casual',
  };

  private readonly remunerationBuckets: { min: number; max: number }[] = [
    { min: 0, max: 5000 },
    { min: 5001, max: 15000 },
    { min: 15001, max: 25000 },
    { min: 25001, max: 40000 },
    { min: 40001, max: 55000 },
    { min: 55001, max: 70000 },
    { min: 70001, max: 85000 },
    { min: 85001, max: 100000 },
    { min: 100001, max: Infinity },
  ];

  private readonly formatRemuneration = (value: number): string => {
    return `${Math.floor(value / 1000)}K`;
  };

  private readonly nzRegions: string[] = [
    'Northland',
    'Auckland',
    'Waikato',
    'Bay of Plenty',
    'Gisborne',
    'Hawke’s Bay',
    'Taranaki',
    'Manawatū-Whanganui',
    'Wellington',
    'Tasman',
    'Nelson',
    'Marlborough',
    'West Coast',
    'Canterbury',
    'Otago',
    'Southland',
  ];
}
