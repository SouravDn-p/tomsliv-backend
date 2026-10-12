import { StripeModule } from '@/lib/stripe/stripe.module';
import { Module } from '@nestjs/common';
import { GetAllJobsController } from './controllers/get-all-jobs.controller';
import { JobsController } from './controllers/jobs.controller';
import { UserJobsController } from './controllers/user-jobs.controller';
import { FarmOwnerStatsService } from './services/farm-owner-stats.service';
import { GetAllJobsStatsService } from './services/get-all-jobs-stats.service';
import { GetAllJobsService } from './services/get-all-jobs.service';
import { IdealCandidateService } from './services/ideal-candidate.service';
import { JobService } from './services/job.service';
import { UserJobsService } from './services/user-jobs.service';

@Module({
  imports: [StripeModule],
  controllers: [JobsController, GetAllJobsController, UserJobsController],
  providers: [
    JobService,
    GetAllJobsStatsService,
    GetAllJobsService,
    UserJobsService,
    IdealCandidateService,
    FarmOwnerStatsService,
  ],
})
export class JobsModule {}
