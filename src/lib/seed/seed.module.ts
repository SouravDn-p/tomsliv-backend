import { Global, Module } from '@nestjs/common';
import { FileService } from './services/file.service';
import { SuperAdminService } from './services/super-admin.service';
import { SubscriptionPlanService } from './services/subscription-plan.service';

@Global()
@Module({
  imports: [],
  providers: [SuperAdminService, FileService, SubscriptionPlanService],
})
export class SeedModule {}
