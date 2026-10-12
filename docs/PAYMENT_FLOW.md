# Payment Flow Documentation

## Authorization & Roles

The payment system interacts with different user roles:

- **Farm Owner**: Initiates job creation and pays for job adverts.
- **Job Seeker**: Views jobs (does not pay).
- **Admin**: Views and manages jobs/payments.

## 1. Job Creation & Payment Flow (One-Time Payment)

### Step 1: Frontend Initiates Job Creation

The Farm Owner fills out the job creation form and submits it.

**Endpoint**: `POST /jobs`
**Controller**: `JobsController` -> `JobService.createJob`

### Step 2: Backend Logic (Job Creation)

1.  **Validation**: Checks if the user has an active farm.
2.  **Pricing Calculation**:
    - **Early Adopter Check**:
      - First 10 customers aka Early Adopters get a special price ($150).
      - Existing Early Adopters get a 20% discount on their next 3 adverts ($200).
      - Standard price implies $250.
    - **Atomic Reservation**: Logic uses a database transaction to ensure slot limits are respected.
3.  **Database Record**:
    - Job is created with status `PENDING_PAYMENT`.
    - `pricePaid` is recorded on the Job.
    - User status (`isEarlyAdopter`, `earlyAdopterDiscountUsage`) is updated if applicable.
4.  **Stripe Payment Intent**:
    - System creates a Stripe `PaymentIntent` for the calculated amount.
    - **Metadata**: `jobId`, `userId`, `jobTitle` are attached to the intent for webhook tracking.
5.  **Response**:
    - Returns the Job object.
    - Returns `clientSecret` for the Stripe PaymentIntent.
    - Returns pricing breakdown.

### Step 3: Frontend Confirms Payment

The frontend uses the `clientSecret` with Stripe Elements/Stripe.js to confirm the payment.

- `stripe.confirmPayment(...)`

### Step 4: Webhook Processing (Asynchronous)

Once payment succeeds, Stripe sends a webhook event `payment_intent.succeeded` to the backend.

**Endpoint**: `POST /stripe/webhook`
**Service**: `HandleWebhookService`

1.  **Verification**: Validates the webhook signature.
2.  **Event Handling**:
    - Extracts `jobId` from the PaymentIntent metadata.
    - Updates the Job status from `PENDING_PAYMENT` to `ACTIVE`.
    - **Notification**: Triggers a system notification to all interested Job Seekers (via `EventEmitter` -> `QueueEventsEnum.NOTIFICATION`).

## 2. Subscription Flow (Recurring)

_Existing logic matches Stripe Subscriptions via SetupIntents and Invoices._

- **SetupIntent**: Used to save payment methods.
- **Subscription Creation**: Linked to `stripePriceId` and `stripeProductId`.
- **Invoices**: Handled via `invoice.paid` events to keep subscription status active in the database.

## 3. Database Schema Changes

- **Job**: Added `pricePaid` (Float), added `PENDING_PAYMENT` to status enum.
- **User**: Added `isEarlyAdopter` (Boolean), `earlyAdopterDiscountUsage` (Int) to track promotional eligibility.

## 4. Key Services

- **JobService**: Handles business logic for pricing and job creation.
- **StripeService**: Wrapper for Stripe SDK (creating intents, customers, subscriptions).
- **HandleWebhookService**: Central hub for processing asynchronous Stripe events.
