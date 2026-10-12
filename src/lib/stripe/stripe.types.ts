export type StripePaymentMetadata = {
  userId: string;
  email: string;
  name: string;
  planId: string;
  planTitle: string;
  stripeProductId: string;
  stripePriceId?: string;
  jobId?: string;
  jobTitle?: string;
};
