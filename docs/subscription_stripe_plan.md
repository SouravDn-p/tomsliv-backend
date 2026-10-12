# Stripe and subscription plan

There are two separate money flows. The introduction-offer JSON is the one-time job advert price. The monthly farm-owner plan is the Stripe subscription. They do not share a price table.

## Introduction offer

`GET /jobs/introduction-offer-availability` returns this shape:

```json
{
  "success": true,
  "message": "Introduction offer availability checked successfully",
  "data": {
    "isAvailable": true,
    "totalLimit": 10,
    "currentCount": 0,
    "offerDetails": {
      "introductoryPrice": 150,
      "normalPrice": 200,
      "discountPercentage": 20,
      "discountUsageLimit": 3,
      "description": "The first 10 farmers..."
    }
  }
}
```

`normalPrice` in a live response follows `PRICING_CONFIG.NORMAL_PRICE`. That constant is currently `200`, so the API returns `200`, not `250`.

### Where the fields come from

| Field | Source |
| --- | --- |
| `introductoryPrice`, `normalPrice`, `discountPercentage`, `discountUsageLimit`, `totalLimit` | `src/main/jobs/constants/pricing.constants.ts` |
| `currentCount`, `isAvailable` | Count of `users` where `isEarlyAdopter = true` |
| `description` | Built in `JobService.checkIntroductionOfferAvailability` |

`isAvailable` is true while that count is below `EARLY_ADOPTER_LIMIT` (10).

The homepage calls this through `useGetIntroductionOfferAvailabilityQuery` (`GET /jobs/introduction-offer-availability`) and shows the early-bird card while `isAvailable` is true.

### What is stored

The prices are not in Postgres and not in a Stripe Price. Only eligibility and usage are stored on `users`:

- `isEarlyAdopter` is set when a farm owner registers. If fewer than 10 early adopters exist, the new farmer is marked `true`. Worker registration does not set this flag.
- `earlyAdopterDiscountUsage` starts at `0` and increases by 1 after a discounted job payment succeeds.

### Price charged when a job is created

`JobService.createJob` chooses the amount:

1. Early adopter, usage `0`: `EARLY_ADOPTER_PRICE` ($150).
2. Early adopter, usage `1` to `3`: `NORMAL_PRICE * (1 - 0.2)`. With `NORMAL_PRICE` at 200, that is $160.
3. Everyone else, and early adopters after the discount limit: `NORMAL_PRICE` ($200).

The job is saved as `PENDING_PAYMENT` with `pricePaid`. The backend then creates a Stripe PaymentIntent for `pricePaid * 100` cents, currency `nzd`, using `STRIPE_SECRET_KEY`. Metadata includes `jobId` and `userId`. The plan fields on that intent are placeholders (`job-advert-one-time`); this charge is not the monthly plan.

The frontend opens `PaymentModal` with `VITE_STRIPE_PUBLIC_KEY` and confirms the card. Stripe sends `payment_intent.succeeded` to `POST /subscription/webhook/stripe`. The webhook sets the job to `ACTIVE` and, when the payment counts as discounted, increments `earlyAdopterDiscountUsage`.

### How to change the intro prices

Edit `src/main/jobs/constants/pricing.constants.ts` and restart the backend. `STRIPE_SECRET_KEY` does not store these numbers. It only authenticates the PaymentIntent for whatever amount the code computed.

```ts
export const PRICING_CONFIG = {
  NORMAL_PRICE: 200,
  EARLY_ADOPTER_PRICE: 150,
  EARLY_ADOPTER_DISCOUNT_PERCENTAGE: 0.2, // 20%
  EARLY_ADOPTER_DISCOUNT_USAGE_LIMIT: 3,
  EARLY_ADOPTER_LIMIT: 10,
};
```

The homepage standard card reads `offerDetails.normalPrice` from this same response.

`handleJobPayment` in `src/main/subscription/services/handle-webhook.service.ts` still treats a payment as discounted when `pricePaid < 250`. Change that check to `PRICING_CONFIG.NORMAL_PRICE`, or the usage counter will disagree with the amount Stripe charges.

The comment in `createJob` still says “250 − 20% = 200”. The calculation uses `NORMAL_PRICE`, which is 200, so 20% off is 160.

## Monthly subscription

This plan is separate from the introduction offer.

On startup, `SubscriptionPlanService` looks for an active row in `subscription_plans`. If one exists, it does nothing. If none exists, it uses `STRIPE_SECRET_KEY` to find a Stripe price with lookup key `farm_owner_monthly`. If that price is missing, it creates a Stripe product and price:

- Title: Farm Owner Monthly Plan
- Amount: 5000 cents ($50)
- Currency: `nzd`
- Interval: month
- Lookup key: `farm_owner_monthly`

It then inserts `subscription_plans` with `stripeProductId`, `stripePriceId`, `priceCents`, and `isActive: true`.

### Checkout

1. `POST /subscription/intent` loads the active plan and creates a Stripe SetupIntent. Metadata carries `planId`, `stripeProductId`, and `stripePriceId`.
2. A `user_subscriptions` row is created with status `PENDING` and `stripeTransactionId` set to the SetupIntent id.
3. On `setup_intent.succeeded`, the webhook creates a Stripe subscription on that price and stores `stripeSubscriptionId`, `stripeCustomerId`, and the default payment method.
4. On `invoice.paid` / `invoice.payment_succeeded`, the local subscription becomes `ACTIVE`, the user `subscriptionStatus` becomes `ACTIVE`, and an `invoices` row is written.
5. `customer.subscription.updated` maps Stripe status onto `ACTIVE`, `FAILED`, or `CANCELED`.
6. `POST /subscription/me/cancel` cancels the Stripe subscription.

Related reads: `GET /subscription` (plan for the user) and `GET /subscription/me` (current status).

### How to change the monthly price

Stripe prices are immutable. Do not edit the existing Price.

1. In the Stripe dashboard, or with the API using `STRIPE_SECRET_KEY`, create a new Price on the same product. Set the new amount in cents, currency `nzd`, and a monthly interval. Use a new lookup key if you want the seed to find it later.
2. Update the active `subscription_plans` row: set `stripePriceId` and `priceCents` to the new price. Leave `isActive` true on that row only.
3. Restart is not required for the intent endpoint. It reads the plan from the database.
4. Farmers who already subscribed stay on the old Stripe price until their subscription is updated in Stripe.

If the `subscription_plans` table is empty, the next backend start will seed $50 NZD again unless a price with lookup key `farm_owner_monthly` already exists in Stripe.

## Keys

| Key | Where | Used for |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Backend `.env` | PaymentIntents, products, prices, subscriptions, customers |
| `STRIPE_WEBHOOK_SECRET` | Backend `.env` | Verifying `POST /subscription/webhook/stripe` |
| `VITE_STRIPE_PUBLIC_KEY` | Frontend env | Stripe.js in the job payment modal |

`.env` is gitignored. Do not put secret keys in source files.
