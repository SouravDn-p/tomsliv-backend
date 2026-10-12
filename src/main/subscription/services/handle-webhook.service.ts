import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { QueuePayload } from '@/lib/queue/interface/queue.payload';
import { StripeService } from '@/lib/stripe/stripe.service';
import { StripePaymentMetadata } from '@/lib/stripe/stripe.types';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '@prisma';
import Stripe from 'stripe';

@Injectable()
export class HandleWebhookService {
  private readonly logger = new Logger(HandleWebhookService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleError('Failed to handle Stripe webhook', 'Subscription')
  async handleWebhook(signature: string, rawBody: Buffer) {
    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature);
      this.logger.log(`Received Stripe event: ${event.type}`);
      await this.handleEvent(event);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new AppError(400, 'Invalid webhook signature');
    }
  }

  private async handleEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'setup_intent.succeeded':
        await this.handleSetupIntentSucceeded(
          event.data.object as Stripe.SetupIntent,
        );
        break;

      case 'setup_intent.setup_failed':
      case 'setup_intent.canceled':
        await this.handleSetupIntentFailed(
          event.data.object as Stripe.SetupIntent,
        );
        break;

      case 'customer.subscription.updated':
        await this.handleCustomerSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const metadata = paymentIntent.metadata as unknown as StripePaymentMetadata;
    this.logger.log(`Processing payment_intent.succeeded: ${paymentIntent.id}`);

    if (metadata.jobId) {
      // Handle Job Payment
      await this.handleJobPayment(paymentIntent, metadata);
    } else {
      // Handle other one-time payments if any
      this.logger.warn(
        `PaymentIntent ${paymentIntent.id} has no known handler (missing jobId or planId logic)`,
      );
    }
  }

  private async handleJobPayment(
    paymentIntent: Stripe.PaymentIntent,
    metadata: StripePaymentMetadata,
  ) {
    const { jobId, userId } = metadata;

    if (!jobId || !userId) {
      this.logger.error('Missing jobId or userId in metadata for job payment');
      return;
    }

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      this.logger.error(
        `Job ${jobId} not found for payment ${paymentIntent.id}`,
      );
      return;
    }

    if (job.status === 'ACTIVE') {
      this.logger.log(`Job ${jobId} is already ACTIVE. Skipping.`);
      return;
    }

    // Determine if we need to increment discount usage
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.error(
        `User ${userId} not found for payment ${paymentIntent.id}`,
      );
      return;
    }

    // Checking discount: If pricePaid < 250 (Normal Price), it implies a discount was used.
    // Early Adopters get $150 (first) or $200 (next 3). Both are < 250.
    const isDiscounted = (job.pricePaid || 0) < 250;
    const shouldIncrementUsage = user.isEarlyAdopter && isDiscounted;

    await this.prisma.client.$transaction(async (tx) => {
      // 1. Activate Job
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'ACTIVE',
          paidAt: new Date(),
        },
      });

      // 2. Increment Usage if applicable
      if (shouldIncrementUsage) {
        await tx.user.update({
          where: { id: userId },
          data: {
            earlyAdopterDiscountUsage: {
              increment: 1,
            },
          },
        });
        this.logger.log(
          `Incremented earlyAdopterDiscountUsage for user ${userId}`,
        );
      }
    });

    this.logger.log(
      `Job ${jobId} activated successfully after payment ${paymentIntent.id}`,
    );

    // Notify users about the new job
    const userWithFarm = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { farm: true },
    });

    if (userWithFarm && userWithFarm.farm) {
      this.notifyNewJob(jobId, job.title, userWithFarm.farm.name);
    }
  }

  private async notifyNewJob(
    jobId: string,
    jobTitle: string,
    farmName: string,
  ) {
    const interestedUsers = await this.prisma.client.user.findMany({
      where: {
        role: UserRole.USER,
        notificationSettings: {
          newRelatedJobsAlert: true,
        },
      },
      select: { id: true },
    });

    if (interestedUsers.length === 0) return;

    const payload: QueuePayload = {
      recipients: interestedUsers,
      type: QueueEventsEnum.NOTIFICATION,
      title: 'New Job Posted',
      message: `A new job "${jobTitle}" at ${farmName} matches your interests.`,
      createdAt: new Date(),
      meta: {
        performedBy: 'system',
        recordType: 'Job',
        recordId: jobId,
      },
    };

    this.eventEmitter.emit(QueueEventsEnum.NOTIFICATION, payload);
  }

  private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
    const setupIntentId = setupIntent.id;
    const metadata = setupIntent.metadata as unknown as StripePaymentMetadata;
    const customerId = setupIntent.customer as string;
    this.logger.log(`Processing setup_intent.succeeded: ${setupIntentId}`);

    const subscription = await this.prisma.client.userSubscription.findUnique({
      where: { stripeTransactionId: setupIntentId },
    });

    if (!subscription) {
      this.logger.error(
        `No local subscription found for setupIntent ${setupIntentId}`,
      );
      return;
    }

    if (subscription.stripeSubscriptionId) {
      this.logger.log(
        `Subscription ${subscription.id} already linked to Stripe subscription ${subscription.stripeSubscriptionId}`,
      );
      return;
    }

    const paymentMethodId = setupIntent.payment_method as string;
    if (!paymentMethodId || !metadata.stripePriceId) {
      this.logger.warn(
        `SetupIntent ${setupIntentId} has no payment method or missing price ID`,
      );
      return;
    }

    try {
      // Create Stripe subscription
      const stripeSub = await this.stripeService.createSubscription({
        customerId,
        priceId: metadata.stripePriceId, // Now guaranteed string
        metadata,
        paymentMethodId,
      });

      await this.prisma.client.$transaction(async (prisma) => {
        // Clear any duplicate Stripe subscription links
        const existing = await prisma.userSubscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });

        if (existing && existing.id !== subscription.id) {
          this.logger.warn(
            `Duplicate stripeSubscriptionId found for subscription ${existing.id}. Clearing.`,
          );
          await prisma.userSubscription.update({
            where: { id: existing.id },
            data: { stripeSubscriptionId: null, status: 'CANCELED' },
          });
        }

        // Update local subscription
        await prisma.userSubscription.update({
          where: { id: subscription.id },
          data: { stripeSubscriptionId: stripeSub.id, status: 'PENDING' },
        });

        // Update user with Stripe info
        await prisma.user.update({
          where: { id: subscription.userId },
          data: {
            stripeCustomerId: customerId,
            stripeDefaultPaymentMethodId: paymentMethodId,
            subscriptionStatus: 'PENDING',
          },
        });
      });

      this.logger.log(
        `Subscription ${subscription.id} linked to Stripe subscription ${stripeSub.id}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to handle setup_intent.succeeded for subscription ${subscription.id}`,
        err,
      );
      throw err;
    }
  }

  private async handleSetupIntentFailed(setupIntent: Stripe.SetupIntent) {
    const setupIntentId = setupIntent.id;
    const subscription = await this.prisma.client.userSubscription.findUnique({
      where: { stripeTransactionId: setupIntentId },
    });

    if (!subscription) return;

    await this.prisma.client.userSubscription.update({
      where: { id: subscription.id },
      data: { status: 'FAILED', failedAt: new Date() },
    });

    this.logger.warn(`SetupIntent failed for subscription ${subscription.id}`);
  }

  private async handleCustomerSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ) {
    const stripeSubId = subscription.id;

    const local = await this.prisma.client.userSubscription.findUnique({
      where: { stripeSubscriptionId: stripeSubId },
      include: { plan: true },
    });
    if (!local) return;

    const updates: any = {};
    switch (subscription.status) {
      case 'active':
        updates.status = 'ACTIVE';
        break;
      case 'past_due':
        updates.status = 'FAILED';
        break;
      case 'canceled':
      case 'incomplete_expired':
      case 'unpaid':
      case 'incomplete':
        updates.status = 'CANCELED';
        break;
    }

    if (subscription.cancel_at)
      updates.planEndedAt = new Date(subscription.cancel_at * 1000);
    if (subscription.ended_at)
      updates.planEndedAt = new Date(subscription.ended_at * 1000);

    if (Object.keys(updates).length) {
      await this.prisma.client.userSubscription.update({
        where: { id: local.id },
        data: updates,
      });
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    this.logger.log(`Processing invoice.paid: ${invoice.id}`);

    const lineItem = invoice.lines?.data?.[0];
    if (!lineItem) {
      this.logger.warn(`Invoice ${invoice.id} has no line items. Skipping.`);
      return;
    }

    const subscriptionId =
      lineItem.parent?.subscription_item_details?.subscription;
    const metadata = lineItem.metadata as StripePaymentMetadata | undefined;

    if (!subscriptionId || !metadata) {
      this.logger.warn(
        `Invoice ${invoice.id} missing subscription ID or metadata. Skipping.`,
      );
      return;
    }

    const { userId, planId } = metadata;

    // Fetch local subscription
    const localSubscription =
      await this.prisma.client.userSubscription.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: subscriptionId },
            ...(userId && planId ? [{ userId, planId }] : []),
          ],
        },
        include: { plan: true },
      });

    if (!localSubscription) {
      this.logger.error(
        `No local subscription found for Stripe subscription ${subscriptionId} (invoice ${invoice.id})`,
      );
      return;
    }

    const existingInvoice = await this.prisma.client.invoice.findUnique({
      where: { stripeInvoiceId: invoice.id },
    });

    const now = new Date();

    await this.prisma.client.$transaction(async (prisma) => {
      // Clear duplicates
      const duplicateSub = await prisma.userSubscription.findFirst({
        where: {
          stripeSubscriptionId: subscriptionId,
          NOT: { id: localSubscription.id },
        },
      });

      if (duplicateSub) {
        this.logger.warn(
          `Duplicate stripeSubscriptionId found on subscription ${duplicateSub.id}. Clearing it.`,
        );
        await prisma.userSubscription.update({
          where: { id: duplicateSub.id },
          data: { stripeSubscriptionId: null, status: 'CANCELED' },
        });
      }

      const planStartedAt = new Date(invoice.period_start * 1000);
      const planEndedAt = new Date(lineItem.period.end * 1000);

      // Update subscription
      await prisma.userSubscription.update({
        where: { id: localSubscription.id },
        data: {
          status: 'ACTIVE',
          paidAt: now,
          startedAt: planStartedAt,
          endedAt: planEndedAt,
          stripeSubscriptionId: subscriptionId,
        },
      });

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'ACTIVE',
        },
      });

      // Create invoice record
      if (!existingInvoice) {
        await prisma.invoice.create({
          data: {
            stripeInvoiceId: invoice.id,
            user: { connect: { id: userId } },
            subscription: { connect: { id: localSubscription.id } },
            amount: invoice.amount_paid ?? invoice.total ?? 0,
            currency: invoice.currency ?? 'nzd',
            status: 'PAID',
            paidAt: invoice.status_transitions.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000)
              : now,
          },
        });
      }
    });

    this.logger.log(
      `Invoice ${invoice.id} processed. Subscription ${localSubscription.id} is now ACTIVE`,
    );
  }
}
