import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { StripeService } from '@/lib/stripe/stripe.service';
import { StripePaymentMetadata } from '@/lib/stripe/stripe.types';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CreateIntentService {
  private readonly logger = new Logger(CreateIntentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  @HandleError('Failed to create setup intent', 'Subscription')
  async createSetupIntent(userId: string): Promise<TResponse<any>> {
    const now = new Date();

    // Load user
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // Prevent duplicate active subscriptions
    const activeSubscription =
      await this.prisma.client.userSubscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          endedAt: { gt: now },
        },
      });

    if (activeSubscription) {
      throw new AppError(400, 'User already has an active subscription');
    }

    // Get single active plan
    const plan = await this.prisma.client.subscriptionPlan.findFirst({
      where: { isActive: true },
    });

    if (!plan) {
      throw new AppError(500, 'No active subscription plan found');
    }

    // Fail old pending subscriptions
    await this.prisma.client.userSubscription.updateMany({
      where: {
        userId,
        planId: plan.id,
        status: 'PENDING',
      },
      data: { status: 'FAILED' },
    });

    // Stripe metadata
    const metadata: StripePaymentMetadata = {
      userId: user.id,
      email: user.email,
      name: user.name,
      planId: plan.id,
      planTitle: plan.title,
      stripeProductId: plan.stripeProductId,
      stripePriceId: plan.stripePriceId,
    };

    // Create SetupIntent (payment method only)
    const setupIntent = await this.stripe.createSetupIntent(metadata);

    // Create local pending subscription
    await this.prisma.client.userSubscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'PENDING',
        startedAt: now,
        endedAt: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()), // monthly
        stripeTransactionId: setupIntent.id,
      },
    });

    this.logger.log(
      `SetupIntent ${setupIntent.id} created for user ${user.email}`,
    );

    // Response
    return successResponse(
      {
        setupIntentId: setupIntent.id,
        setupIntentSecret: setupIntent.client_secret,
        amount: plan.priceCents,
        currency: plan.currency,
        planTitle: plan.title,
      },
      'Setup intent created successfully',
    );
  }
}
