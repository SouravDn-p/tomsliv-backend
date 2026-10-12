import { Module } from '@nestjs/common';
import { JobApplicationsController } from './controllers/job-applications.controller';
import { PublicJobApplicationsController } from './controllers/public-job-applications.controller';
import { GetFarmOwnerApplicationsService } from './services/get-farm-owner-applications.service';
import { JobApplicationsService } from './services/job-applications.service';
import { ManageJobApplicationsService } from './services/manage-job-applications.service';

@Module({
  controllers: [JobApplicationsController, PublicJobApplicationsController],
  providers: [
    JobApplicationsService,
    GetFarmOwnerApplicationsService,
    ManageJobApplicationsService,
  ],
  exports: [
    JobApplicationsService,
    GetFarmOwnerApplicationsService,
    ManageJobApplicationsService,
  ],
})
export class JobApplicationsModule {}
