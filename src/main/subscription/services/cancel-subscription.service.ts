import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { StripeService } from '@/lib/stripe/stripe.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CancelSubscriptionService {
  private readonly logger = new Logger(CancelSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  @HandleError('Failed to cancel subscription')
  async cancelSubscriptionImmediately(
    userId: string,
  ): Promise<TResponse<null>> {
    const subscription = await this.prisma.client.userSubscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (!subscription) {
      this.logger.warn(`No active subscription found for user ${userId}`);
      // Even if no subscription exists, ensure user subscriptionStatus is updated
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { subscriptionStatus: 'CANCELED' },
      });
      return successResponse(
        null,
        'Subscription cancelled successfully (no active subscription)',
      );
    }

    // Cancel on Stripe if subscription exists
    if (subscription.stripeSubscriptionId) {
      try {
        await this.stripe.cancelSubscription({
          subscriptionId: subscription.stripeSubscriptionId,
          atPeriodEnd: false,
        });
        this.logger.log(
          `Stripe subscription ${subscription.stripeSubscriptionId} cancelled for user ${userId}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to cancel Stripe subscription: ${err.message}`,
        );
      }
    }

    // Update subscription and user records in DB
    await this.prisma.client.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELED',
        endedAt: new Date(),
      },
    });

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'CANCELED',
      },
    });

    this.logger.log(
      `Subscription ${subscription.stripeSubscriptionId ?? subscription.id} cancelled immediately for user ${userId}`,
    );

    return successResponse(null, 'Subscription cancelled successfully');
  }
}
