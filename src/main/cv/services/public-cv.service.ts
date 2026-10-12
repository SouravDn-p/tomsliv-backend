import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { OtpType, UserRole, UserStatus } from '@prisma';
import { CreateCvBodyDto } from '../dto/create-cv.dto';

@Injectable()
export class PublicCvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly authMail: AuthMailService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
  ) {}

  @HandleError('Failed to upload public CV', 'PublicCV')
  async uploadPublicCv(dto: CreateCvBodyDto): Promise<TResponse<any>> {
    const email = dto.coreInfo.email.toLowerCase();
    const fullName = `${dto.coreInfo.firstName} ${dto.coreInfo.lastName}`;

    let user;
    let isNewUser = false;

    // -------------------------------------------
    // 1. CHECK IF USER EXISTS
    // -------------------------------------------
    user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      // -------------------------------------------
      // 2. CREATE NEW USER FOR PUBLIC CV
      // -------------------------------------------
      isNewUser = true;

      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await this.authUtils.hash(tempPassword);

      user = await this.prisma.client.user.create({
        data: {
          email,
          name: fullName,
          role: UserRole.USER,
          password: hashedPassword,
          status: UserStatus.ACTIVE,
          isVerified: true,
          notificationSettings: {
            create: {},
          },
        },
      });
    }

    // -------------------------------------------
    // 3. FILE VALIDATIONS (optional CV, CL)
    // -------------------------------------------
    if (dto.fileId) {
      const file = await this.prisma.client.fileInstance.findUnique({
        where: { id: dto.fileId },
      });

      if (!file) {
        throw new AppError(HttpStatus.NOT_FOUND, 'CV file not found');
      }
    }

    if (dto.coverLetterFileId) {
      const file = await this.prisma.client.fileInstance.findUnique({
        where: { id: dto.coverLetterFileId },
      });

      if (!file) {
        throw new AppError(HttpStatus.NOT_FOUND, 'Cover letter file not found');
      }
    }

    // -------------------------------------------
    // 4. PREPARE CV DATA
    // -------------------------------------------
    const cvData = {
      firstName: dto.coreInfo.firstName,
      lastName: dto.coreInfo.lastName,
      email: dto.coreInfo.email,
      phone: dto.coreInfo.phone,
      location: dto.coreInfo.location,
      summary: dto.coreInfo.summary,
      jobTitle: dto.coreInfo.jobTitle,
      jobType: dto.coreInfo.jobType,
      availability: dto.coreInfo.availability,
      hasDrivingLicense: dto.coreInfo.hasDrivingLicense,
      eligibleToWorkInNZ: dto.coreInfo.eligibleToWorkInNZ,
      workPermitType: dto.coreInfo.workPermitType,
      isSaved: true,
    };

    const experiencesRel =
      dto.experiences?.map((exp) => ({
        jobTitle: exp.jobTitle,
        jobType: exp.jobType,
        company: exp.company,
        summary: exp.summary,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isOngoing: exp.isOngoing,
      })) || [];

    const educationsRel =
      dto.educations?.map((edu) => ({
        degree: edu.degree,
        institution: edu.institution,
        startDate: edu.startDate,
        endDate: edu.endDate,
        isOngoing: edu.isOngoing,
      })) || [];

    // -------------------------------------------
    // 5. UPSERT CV (same logic as upsertCv)
    // -------------------------------------------
    let cv;

    if (user.savedCVId) {
      // Update existing CV
      cv = await this.prisma.client.cV.update({
        where: { id: user.savedCVId },
        data: {
          ...cvData,
          ...(dto.fileId && {
            customCV: { connect: { id: dto.fileId } },
          }),
          ...(dto.coverLetterFileId && {
            customCoverLetter: { connect: { id: dto.coverLetterFileId } },
          }),
          experiences: {
            deleteMany: {},
            create: experiencesRel,
          },
          educations: {
            deleteMany: {},
            create: educationsRel,
          },
        },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
          customCoverLetter: true,
        },
      });
    } else {
      // Create new CV
      cv = await this.prisma.client.cV.create({
        data: {
          ...cvData,
          user: { connect: { id: user.id } },
          ...(dto.fileId && {
            customCV: { connect: { id: dto.fileId } },
          }),
          ...(dto.coverLetterFileId && {
            customCoverLetter: { connect: { id: dto.coverLetterFileId } },
          }),
          experiences: { create: experiencesRel },
          educations: { create: educationsRel },
        },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
          customCoverLetter: true,
        },
      });

      // Attach CV to user
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { savedCVId: cv.id },
      });
    }

    // -------------------------------------------
    // 6. SEND EMAIL (new/old user logic)
    // -------------------------------------------
    if (isNewUser) {
      const otp = await this.authUtils.generateOTPAndSave(
        user.id,
        OtpType.RESET,
      );

      await this.authMail.sendWelcomeGuestEmail(email, otp.toString());
    } else {
      await this.authMail.sendCvUpdatedEmail(email, fullName);
    }

    // -------------------------------------------
    // 7. TRIGGER AI RE-SCORE
    // -------------------------------------------
    await this.applicationAITrigger.triggerForCVUpdate(cv.id);

    // -------------------------------------------
    // 8. RETURN RESPONSE
    // -------------------------------------------
    return successResponse(
      {
        userId: user.id,
        isNewUser,
        cvId: cv.id,
        cv,
      },
      'CV uploaded successfully',
    );
  }
}
