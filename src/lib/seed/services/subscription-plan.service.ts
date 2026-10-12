import { PrismaService } from '@/lib/prisma/prisma.service';
import { StripeService } from '@/lib/stripe/stripe.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SubscriptionPlanService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedPlan();
    } catch (error) {
      this.logger.error(
        '[SKIP] Subscription plan seed failed. Set a valid STRIPE_SECRET_KEY to seed the default plan.',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async seedPlan() {
    // Check active plan in DB
    const existingPlan = await this.prisma.client.subscriptionPlan.findFirst({
      where: { isActive: true },
    });

    if (existingPlan) {
      this.logger.log(
        '[EXIST] Active subscription plan already exists, skipping...',
      );
      return;
    }

    // Try to reuse existing Stripe price (by metadata or lookup key)
    const existingPrice =
      await this.stripe.getActivePriceByLookupKey('farm_owner_monthly');

    let stripeProductId: string;
    let stripePriceId: string;

    if (existingPrice) {
      stripeProductId = existingPrice.product as string;
      stripePriceId = existingPrice.id;

      this.logger.log(`[REUSE] Reusing Stripe price ${stripePriceId}`);
    } else {
      const { stripePrice } = await this.stripe.createProductWithPrice({
        title: 'Farm Owner Monthly Plan',
        description: 'Monthly subscription for farm owners',
        priceCents: 5000,
        currency: 'nzd',
        lookupKey: 'farm_owner_monthly',
      });

      stripeProductId = stripePrice.product as string;
      stripePriceId = stripePrice.id;

      this.logger.log(`[STRIPE] Created product & price ${stripePriceId}`);
    }

    // Create DB plan
    await this.prisma.client.subscriptionPlan.create({
      data: {
        title: 'Farm Owner Monthly Plan',
        description: 'Monthly subscription for farm owners',
        priceCents: 5000,
        currency: 'nzd',
        isActive: true,
        stripeProductId,
        stripePriceId,
      },
    });

    this.logger.log('[CREATED] Default subscription plan seeded');
  }
}
