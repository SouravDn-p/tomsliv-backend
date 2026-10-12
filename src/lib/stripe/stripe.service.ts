import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripePaymentMetadata } from './stripe.types';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.getOrThrow<string>(
      ENVEnum.STRIPE_SECRET_KEY,
    );
    this.stripe = new Stripe(secretKey);
  }

  // Product & Price Management
  // Product & Price Management
  async createProductWithPrice({
    title,
    description,
    priceCents,
    currency = 'nzd',
    interval = 'month',
    intervalCount = 1,
    lookupKey,
  }: {
    title: string;
    description: string;
    priceCents: number;
    currency?: string;
    interval?: 'month' | 'year';
    intervalCount?: number;
    lookupKey?: string;
  }) {
    const product = await this.stripe.products.create({
      name: title,
      description,
    });

    const stripePrice = await this.stripe.prices.create({
      product: product.id,
      unit_amount: priceCents,
      currency,
      recurring: {
        interval,
        interval_count: intervalCount,
      },
      ...(lookupKey && { lookup_key: lookupKey }),
    });

    this.logger.log(
      `Created Stripe product ${product.id} with price ${stripePrice.id}`,
    );

    return { product, stripePrice };
  }

  async updatePrice({
    productId,
    newPriceCents,
    currency = 'nzd',
    interval = 'month',
    intervalCount = 1,
  }: {
    productId: string;
    newPriceCents: number;
    intervalCount?: number;
    interval?: 'month' | 'year';
    currency?: string;
  }) {
    const stripePrice = await this.stripe.prices.create({
      product: productId,
      unit_amount: newPriceCents,
      currency,
      recurring: {
        interval,
        interval_count: intervalCount,
      },
    });

    this.logger.log(
      `Created new price ${stripePrice.id} for product ${productId}`,
    );

    return stripePrice;
  }

  async deleteProduct(productId: string) {
    // Step 1: Mark the product inactive
    const deletedProduct = await this.stripe.products.update(productId, {
      active: false,
    });
    this.logger.log(`Product ${productId} marked inactive`);

    // Step 2: Fetch all related prices
    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
    });

    // Step 3: Deactivate all associated prices
    for (const price of prices.data) {
      await this.stripe.prices.update(price.id, { active: false });
      this.logger.log(`Price ${price.id} marked inactive`);
    }

    return deletedProduct;
  }

  // Setup Intent Management
  async retrieveSetupIntent(setupIntentId: string) {
    const setupIntent = await this.stripe.setupIntents.retrieve(setupIntentId);
    this.logger.log(`Retrieved SetupIntent ${setupIntentId}`);
    return setupIntent;
  }

  async createSetupIntent(metadata: StripePaymentMetadata) {
    try {
      // 1) find or create customer
      const customer = await this.getOrCreateCustomerId({
        userId: metadata.userId,
        email: metadata.email,
        name: metadata.name,
      });

      const customerId = customer.id;

      this.logger.log(
        `Created new Stripe customer ${customerId} for user ${metadata.userId}`,
      );

      // 2) create SetupIntent (no charge — collects & attaches payment method for future use)
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // important for subscriptions / future off-session charges
        metadata: {
          ...metadata,
          customerId,
        },
      });

      this.logger?.log(
        `Created SetupIntent ${setupIntent.id} for customer ${customerId}`,
      );
      return setupIntent; // contains id and client_secret
    } catch (err) {
      this.logger?.error(
        'createSetupIntent failed',
        (err as any)?.message ?? err,
      );
      throw err; // bubble up to caller so your HandleError decorator / logger handles it
    }
  }

  async createPaymentIntent({
    amount,
    currency = 'nzd',
    customerId,
    metadata,
    paymentMethodId,
  }: {
    amount: number;
    currency?: string;
    customerId: string;
    metadata: StripePaymentMetadata;
    paymentMethodId?: string;
  }) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount, // in cents
        currency,
        customer: customerId,
        metadata,
        payment_method: paymentMethodId,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        // If we want to capture immediately
        confirm: !!paymentMethodId,
      });

      this.logger.log(
        `Created PaymentIntent ${paymentIntent.id} for customer ${customerId}`,
      );
      return paymentIntent;
    } catch (err) {
      this.logger.error(
        'createPaymentIntent failed',
        (err as any)?.message ?? err,
      );
      throw err;
    }
  }

  async getActivePriceByLookupKey(lookupKey: string) {
    const prices = await this.stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    if (!prices.data.length) {
      this.logger.log(
        `No active Stripe price found for lookupKey=${lookupKey}`,
      );
      return null;
    }

    const price = prices.data[0];
    this.logger.log(
      `Found Stripe price ${price.id} for lookupKey=${lookupKey}`,
    );

    return price;
  }

  // Customer Management
  async getOrCreateCustomerId({
    userId,
    name,
    email,
  }: {
    userId: string;
    name: string;
    email: string;
  }) {
    // Step 1: Check if the user already has a Stripe customer linked
    const existingCustomer = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomer.data.length > 0) {
      const customer = existingCustomer.data[0];
      this.logger.log(
        `Found existing Stripe customer ${customer.id} for user ${userId}`,
      );
      return customer;
    }

    // Step 2: Create a new Stripe customer
    const newCustomer = await this.stripe.customers.create({
      email,
      name,
      metadata: { userId, email, name },
    });

    this.logger.log(
      `Created new Stripe customer ${newCustomer.id} for user ${userId}`,
    );
    return newCustomer;
  }

  async retrieveCustomer(customerId: string) {
    const customer = await this.stripe.customers.retrieve(customerId);
    this.logger.log(`Retrieved customer ${customerId}`);
    return customer;
  }

  // Subscription Management
  async createSubscription({
    customerId,
    priceId,
    metadata,
    paymentMethodId,
  }: {
    customerId: string;
    priceId: string;
    metadata: StripePaymentMetadata;
    paymentMethodId: string;
  }) {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata,
      expand: ['latest_invoice.payment_intent'],
    });

    this.logger.log(
      `Created Stripe subscription ${subscription.id} for user ${metadata.userId}`,
    );

    return subscription;
  }

  async retrieveSubscription(subscriptionId: string) {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    this.logger.log(`Retrieved subscription ${subscriptionId}`);
    return sub;
  }

  async listCustomerSubscriptions(customerId: string) {
    const subs = await this.stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });
    this.logger.log(`Listed subscriptions for customer ${customerId}`);
    return subs;
  }

  async cancelSubscription({
    subscriptionId,
    atPeriodEnd = true,
    invoiceNow = false,
  }: {
    subscriptionId: string;
    atPeriodEnd?: boolean;
    invoiceNow?: boolean;
  }) {
    if (atPeriodEnd) {
      const updated = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      this.logger.log(
        `Subscription ${subscriptionId} scheduled to cancel at period end`,
      );

      if (invoiceNow) {
        // create an invoice for any pending prorations or upcoming items
        await this.stripe.invoices.create({
          customer: updated.customer as string,
        });
      }

      return updated;
    }

    // immediate cancellation
    const deleted = await this.stripe.subscriptions.cancel(subscriptionId);
    this.logger.log(`Subscription ${subscriptionId} cancelled immediately`);
    return deleted;
  }

  // Stripe Webhook Utilities
  constructWebhookEvent(rawBody: Buffer, signature: string) {
    const endpointSecret = this.configService.getOrThrow<string>(
      ENVEnum.STRIPE_WEBHOOK_SECRET,
    );
    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      );
    } catch (err) {
      this.logger.error('Invalid webhook signature', err);
      throw new Error('Invalid webhook signature');
    }
  }
}
