import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

@Injectable()
export class AdminSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Error getting stats')
  async getStats() {
    const now = DateTime.now();

    // Total revenue (Jobs)
    const totalRevenueResult = await this.prisma.client.job.aggregate({
      _sum: { pricePaid: true },
      where: { status: 'ACTIVE' },
    });

    const totalRevenue = totalRevenueResult._sum.pricePaid || 0;

    // Total revenue this week
    const startOfWeek = now.startOf('week').toJSDate();
    const endOfWeek = now.endOf('week').toJSDate();

    const weeklyRevenueResult = await this.prisma.client.job.aggregate({
      _sum: { pricePaid: true },
      where: {
        status: 'ACTIVE',
        createdAt: { gte: startOfWeek, lte: endOfWeek },
      },
    });

    const weeklyRevenue = weeklyRevenueResult._sum.pricePaid || 0;

    // Total transactions (Active Jobs)
    const totalTransactions = await this.prisma.client.job.count({
      where: { status: 'ACTIVE', paidAt: { not: null } },
    });

    // No subscriptions anymore
    const runningSubscriptions = 0;

    const stats = {
      totalRevenue,
      weeklyRevenue,
      totalTransactions,
      runningSubscriptions,
    };

    return successResponse(stats, 'Stats fetched successfully');
  }

  @HandleError('Error getting revenue last 7 days')
  async getRevenueLast7Days() {
    const today = DateTime.now().startOf('day');
    const revenueData: { label: string; value: number; date: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = today.minus({ days: i });
      const start = day.startOf('day').toJSDate();
      const end = day.endOf('day').toJSDate();

      const sumResult = await this.prisma.client.job.aggregate({
        _sum: { pricePaid: true },
        where: { status: 'ACTIVE', createdAt: { gte: start, lte: end } },
      });

      revenueData.push({
        label: day.toFormat('ccc dd'), // e.g., "Mon 15"
        value: sumResult._sum.pricePaid || 0,
        date: day.toISODate(),
      });
    }

    return successResponse(revenueData, 'Revenue last 7 days fetched');
  }

  @HandleError('Error getting revenue last 6 months')
  async getRevenueLast6Months() {
    const now = DateTime.now();
    const revenueData: { label: string; value: number; month: string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const month = now.minus({ months: i });
      const start = month.startOf('month').toJSDate();
      const end = month.endOf('month').toJSDate();

      const sumResult = await this.prisma.client.job.aggregate({
        _sum: { pricePaid: true },
        where: { status: 'ACTIVE', createdAt: { gte: start, lte: end } },
      });

      revenueData.push({
        label: month.toFormat('LLL yyyy'),
        value: sumResult._sum.pricePaid || 0,
        month: month.toISODate(),
      });
    }

    return successResponse(revenueData, 'Revenue last 6 months fetched');
  }

  @HandleError('Error getting payment history')
  async getPaymentHistory(dto: PaginationDto) {
    const page = dto.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const jobs = await this.prisma.client.job.findMany({
      where: { status: 'ACTIVE', pricePaid: { not: null } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        farm: {
          include: {
            users: true,
          },
        },
      },
    });

    const data = jobs.map((job) => {
      const user = job.farm.users;
      return {
        id: job.id,
        user: {
          name: user ? user.name : job.farm.name,
          email: user ? user.email : 'N/A',
        },
        subscription: { plan: { title: 'Job Advert' } },
        amount: job.pricePaid,
        currency: 'USD',
        status: 'PAID',
        issuedAt: job.createdAt,
        paidAt: job.paidAt,
      };
    });

    return successPaginatedResponse(
      data,
      {
        page,
        limit,
        total: await this.prisma.client.job.count({
          where: { status: 'ACTIVE', pricePaid: { not: null } },
        }),
      },
      'Successfully found payment history',
    );
  }
}
