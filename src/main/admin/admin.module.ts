import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './services/admin-stats.service';
import { AdminSubscriptionService } from './services/admin-subscription.service';
import { FarmOwnerService } from './services/farm-owner.service';
import { JobsService } from './services/jobs.service';
import { PaymentService } from './services/payment.service';
import { UserService } from './services/user.service';

@Module({
  controllers: [AdminController],
  providers: [
    UserService,
    FarmOwnerService,
    JobsService,
    PaymentService,
    AdminStatsService,
    AdminSubscriptionService,
  ],
})
export class AdminModule {}
