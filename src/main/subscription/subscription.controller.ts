import { GetUser, Public, ValidateAuth } from '@/core/jwt/jwt.decorator';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CancelSubscriptionService } from './services/cancel-subscription.service';
import { CreateIntentService } from './services/create-intent.service';
import { HandleWebhookService } from './services/handle-webhook.service';
import { SubscriptionService } from './services/subscription.service';

@ApiTags('User -- Subscription')
@ApiBearerAuth()
@ValidateAuth()
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly createIntentService: CreateIntentService,
    private readonly handleWebhookService: HandleWebhookService,
    private readonly cancelSubscriptionService: CancelSubscriptionService,
  ) {}

  @ApiOperation({ summary: 'Get plans for user' })
  @Get()
  async getPlansForUser() {
    return this.subscriptionService.getPlanForUser();
  }

  @ApiOperation({ summary: 'Create setup intent' })
  @Post('intent')
  async createSetupIntent(@GetUser('sub') userId: string) {
    return this.createIntentService.createSetupIntent(userId);
  }

  @ApiOperation({ summary: 'Handle Stripe webhook events (Public Endpoint)' })
  @Public() // Allow public access
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() body: Buffer, // raw body for Stripe verification
  ) {
    try {
      await this.handleWebhookService.handleWebhook(signature, body);
      return { received: true };
    } catch (error) {
      return { received: false, error: error.message };
    }
  }

  @ApiOperation({ summary: 'Get current subscription status' })
  @Get('me')
  async getCurrentSubscriptionStatus(@GetUser('sub') userId: string) {
    return this.subscriptionService.getCurrentSubscriptionStatus(userId);
  }

  @ApiOperation({ summary: 'Cancel subscription immediately' })
  @Post('me/cancel')
  async cancelSubscriptionImmediately(@GetUser('sub') userId: string) {
    return this.cancelSubscriptionService.cancelSubscriptionImmediately(userId);
  }
}
