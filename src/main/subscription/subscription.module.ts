import { Module } from '@nestjs/common';
import { CreateIntentService } from './services/create-intent.service';
import { HandleWebhookService } from './services/handle-webhook.service';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionController } from './subscription.controller';
import { CancelSubscriptionService } from './services/cancel-subscription.service';

@Module({
  controllers: [SubscriptionController],
  providers: [
    CreateIntentService,
    SubscriptionService,
    HandleWebhookService,
    CancelSubscriptionService,
  ],
})
export class SubscriptionModule {}
