import { Module } from '@nestjs/common';
import { CvController } from './controllers/cv.controller';
import { PublicCvController } from './controllers/public-cv.controller';
import { CvComparisonService } from './services/cv-compare.service';
import { CvService } from './services/cv.service';
import { PublicCvService } from './services/public-cv.service';

@Module({
  controllers: [CvController, PublicCvController],
  providers: [CvService, CvComparisonService, PublicCvService],
  exports: [CvService],
})
export class CvModule {}
