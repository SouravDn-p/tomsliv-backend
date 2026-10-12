import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Error getting subscription plan')
  async getPlanForUser(): Promise<TResponse<any>> {
    const plan = await this.prisma.client.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    return successResponse(
      {
        plan: plan
          ? {
              id: plan.id,
              title: plan.title,
              description: plan.description,
              price: Math.round(plan.priceCents / 100),
              currency: plan.currency,
            }
          : null,
      },
      'Plan fetched successfully',
    );
  }

  @HandleError('Error getting subscription status')
  async getCurrentSubscriptionStatus(userId: string): Promise<TResponse<any>> {
    const subscription = await this.prisma.client.userSubscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PENDING', 'CANCELED'] },
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: { plan: true },
    });

    // No subscription or canceled subscription
    if (!subscription || subscription.status === 'CANCELED') {
      return successResponse(
        {
          status: 'NONE',
          canSubscribe: true,
          plan: null,
          period: {
            startedAt: null,
            endedAt: null,
            remainingDays: null,
          },
          message: 'No active subscription found.',
        },
        'Subscription status fetched',
      );
    }

    const now = DateTime.now();
    const start = subscription.startedAt
      ? DateTime.fromJSDate(subscription.startedAt)
      : null;
    const end = subscription.endedAt
      ? DateTime.fromJSDate(subscription.endedAt)
      : null;

    const isExpired = end ? end <= now : false;

    let status: 'ACTIVE' | 'PENDING' | 'EXPIRED';

    if (subscription.status === 'PENDING') {
      status = 'PENDING';
    } else if (isExpired) {
      status = 'EXPIRED';
    } else {
      status = 'ACTIVE';
    }

    const canSubscribe = status !== 'ACTIVE' && status !== 'PENDING';

    return successResponse(
      {
        status,
        canSubscribe,
        plan: subscription.plan
          ? {
              title: subscription.plan.title,
              price: Math.round(subscription.plan.priceCents / 100),
              currency: subscription.plan.currency,
            }
          : null,
        period: {
          startedAt: start?.toISODate() || null,
          endedAt: end?.toISODate() || null,
          remainingDays: end
            ? Math.max(Math.ceil(end.diff(now, 'days').days), 0)
            : null,
        },
        message:
          status === 'ACTIVE'
            ? `Your ${subscription.plan?.title} is active until ${end?.toFormat('DDD')}.`
            : status === 'PENDING'
              ? 'Your subscription payment is pending.'
              : `Your subscription expired on ${end?.toFormat('DDD')}.`,
      },
      'Subscription status fetched',
    );
  }
}
