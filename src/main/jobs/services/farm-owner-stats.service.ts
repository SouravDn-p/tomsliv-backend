import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationStatus, JobStatus } from '@prisma';
import { DateTime } from 'luxon';

@Injectable()
export class FarmOwnerStatsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get farm owner statistics', 'JobStats')
  async getFarmOwnerStats(userId: string): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user.farmId) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    const farmId = user.farmId;

    // Date ranges
    const now = DateTime.now();
    const currentMonthStart = now.startOf('month');
    const lastMonthStart = now.minus({ months: 1 }).startOf('month');
    const lastMonthEnd = now.minus({ months: 1 }).set({
      day: now.day,
      hour: now.hour,
      minute: now.minute,
      second: now.second,
    });

    const pmtdEnd =
      lastMonthEnd > now.minus({ months: 1 }).endOf('month')
        ? now.minus({ months: 1 }).endOf('month')
        : lastMonthEnd;

    const currentStats = await this.getStatsForPeriod(
      farmId,
      currentMonthStart.toJSDate(),
      now.toJSDate(),
    );
    const lastMonthStats = await this.getStatsForPeriod(
      farmId,
      lastMonthStart.toJSDate(),
      pmtdEnd.toJSDate(),
    );

    const formatStat = (label: string, value: number, change: number) => ({
      label,
      value,
      formattedValue: `${value}`,
      change,
      changeLabel: `${change}%`,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    });

    const stats = {
      activeJobs: formatStat(
        'Active Jobs',
        currentStats.activeJobs,
        this.calculatePercentageChange(
          currentStats.activeJobs,
          lastMonthStats.activeJobs,
        ),
      ),

      totalApplicants: formatStat(
        'Total Applicants',
        currentStats.totalApplicants,
        this.calculatePercentageChange(
          currentStats.totalApplicants,
          lastMonthStats.totalApplicants,
        ),
      ),

      shortlisted: formatStat(
        'Shortlisted Applicants',
        currentStats.shortlisted,
        this.calculatePercentageChange(
          currentStats.shortlisted,
          lastMonthStats.shortlisted,
        ),
      ),

      averageJobFit: formatStat(
        'Average Job Fit Score',
        parseFloat(currentStats.averageJobFit.toFixed(2)),
        this.calculatePercentageChange(
          currentStats.averageJobFit,
          lastMonthStats.averageJobFit,
        ),
      ),
    };

    return successResponse(stats, 'Farm owner statistics fetched successfully');
  }

  private async getStatsForPeriod(farmId: string, start: Date, end: Date) {
    const [activeJobs, applications] = await this.prisma.client.$transaction([
      this.prisma.client.job.count({
        where: {
          farmId,
          status: JobStatus.ACTIVE,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.client.jobApplication.findMany({
        where: {
          job: { farmId },
          appliedAt: { gte: start, lte: end },
        },
        include: {
          applicationAIResults: {
            select: { jobFitScore: true },
          },
        },
      }),
    ]);

    const totalApplicants = applications.length;
    const shortlisted = applications.filter(
      (app) => app.status === ApplicationStatus.SHORTLISTED,
    ).length;

    const scores = applications
      .map((app) => app.applicationAIResults?.jobFitScore)
      .filter(
        (score): score is number => score !== undefined && score !== null,
      );

    const averageJobFit =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      activeJobs,
      totalApplicants,
      shortlisted,
      averageJobFit,
    };
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  }
}
