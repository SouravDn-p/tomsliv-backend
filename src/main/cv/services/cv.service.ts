import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma';
import { CompareCvDto } from '../dto/compare-cv.dto';
import { CreateCvBodyDto } from '../dto/create-cv.dto';

@Injectable()
export class CvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
  ) {}

  @HandleError('Failed to save CV', 'CV')
  async upsertCv(
    userId: string,
    dto: CreateCvBodyDto,
  ): Promise<TResponse<any>> {
    // 1. Get user to check existence
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { savedCV: true },
    });

    // If fileId is provided check its existence
    if (dto.fileId) {
      const file = await this.prisma.client.fileInstance.findUnique({
        where: { id: dto.fileId },
      });

      if (!file) {
        throw new AppError(HttpStatus.NOT_FOUND, 'CV file not found');
      }
    }

    // If coverLetterFileId is provided check its existence
    if (dto.coverLetterFileId) {
      const file = await this.prisma.client.fileInstance.findUnique({
        where: { id: dto.coverLetterFileId },
      });

      if (!file) {
        throw new AppError(HttpStatus.NOT_FOUND, 'Cover letter file not found');
      }
    }

    // 2. Prepare data for create/update
    const cvData: Prisma.CVCreateInput = {
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

    const experiencesRel: Prisma.ExperienceCreateWithoutCvInput[] =
      dto.experiences?.map((exp) => ({
        jobTitle: exp.jobTitle,
        jobType: exp.jobType,
        company: exp.company,
        summary: exp.summary,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isOngoing: exp.isOngoing,
      })) || [];

    const educationsRel: Prisma.EducationCreateWithoutCvInput[] =
      dto.educations?.map((edu) => ({
        degree: edu.degree,
        institution: edu.institution,
        startDate: edu.startDate,
        endDate: edu.endDate,
        isOngoing: edu.isOngoing,
      })) || [];

    let cv;

    if (user.savedCVId) {
      // Update existing
      cv = await this.prisma.client.cV.update({
        where: { id: user.savedCVId },
        data: {
          ...cvData,
          ...(dto.fileId && {
            customCV: {
              connect: { id: dto.fileId },
            },
          }),
          ...(dto.coverLetterFileId && {
            customCoverLetter: {
              connect: { id: dto.coverLetterFileId },
            },
          }),
          experiences: {
            deleteMany: {}, // Clear old
            create: experiencesRel, // Add new
          },
          educations: {
            deleteMany: {}, // Clear old
            create: educationsRel, // Add new
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
      // Create new and connect to user
      cv = await this.prisma.client.cV.create({
        data: {
          ...cvData,
          user: { connect: { id: userId } },
          ...(dto.fileId && {
            customCV: {
              connect: { id: dto.fileId },
            },
          }),
          ...(dto.coverLetterFileId && {
            customCoverLetter: {
              connect: { id: dto.coverLetterFileId },
            },
          }),
          experiences: {
            create: experiencesRel,
          },
          educations: {
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

      await this.prisma.client.user.update({
        where: { id: userId },
        data: { savedCVId: cv.id },
      });
    }

    // Trigger AI analysis for all applications using this CV
    await this.applicationAITrigger.triggerForCVUpdate(cv.id);

    return successResponse(cv, 'CV saved successfully');
  }

  @HandleError('Failed to get CV', 'CV')
  async getCv(userId: string): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        savedCV: {
          include: {
            experiences: true,
            educations: true,
            customCV: true,
            customCoverLetter: true,
          },
        },
      },
    });

    if (!user.savedCV) {
      throw new AppError(HttpStatus.NOT_FOUND, 'CV not found');
    }

    return successResponse(user.savedCV, 'CV fetched successfully');
  }

  @HandleError('Failed to delete CV', 'CV')
  async deleteCv(userId: string): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { savedCV: true },
    });

    if (!user.savedCVId) {
      throw new AppError(HttpStatus.NOT_FOUND, 'CV not found');
    }

    await this.prisma.client.cV.delete({
      where: { id: user.savedCVId },
    });

    return successResponse(null, 'CV deleted successfully');
  }

  @HandleError('Failed to get all CVs', 'CV')
  async getAllCvs(userId: string): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        savedCV: {
          include: {
            experiences: true,
            educations: true,
            customCV: true,
            customCoverLetter: true,
          },
        },
        cvs: {
          where: { isSaved: false },
          orderBy: { createdAt: 'desc' },
          include: {
            experiences: true,
            educations: true,
            customCV: true,
            customCoverLetter: true,
          },
        },
      },
    });

    const allCvs = [];
    if (user.savedCV) {
      allCvs.push({ ...user.savedCV, isDefault: true });
    }

    allCvs.push(...user.cvs.map((cv) => ({ ...cv, isDefault: false })));

    return successResponse(allCvs, 'All CVs fetched successfully');
  }

  @HandleError('Failed to get recent CVs', 'CV')
  async getRecentCVsForFarmOwner(
    userId: string,
    limit: number = 10,
  ): Promise<TResponse<any>> {
    // 1. Get the farm ID for the user
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user?.farmId) {
      return successResponse([], 'No farm found for this user');
    }

    const uniqueCVs = new Map<string, any>();
    let skip = 0;
    const batchSize = limit * 3; // fetch more per batch to avoid duplicates

    while (uniqueCVs.size < limit) {
      const applications = await this.prisma.client.jobApplication.findMany({
        where: { job: { farmId: user.farmId } },
        orderBy: { appliedAt: 'desc' },
        skip,
        take: batchSize,
        include: {
          cv: {
            include: {
              experiences: true,
              educations: true,
              customCV: true,
              customCoverLetter: true,
            },
          },
          job: { select: { title: true, id: true } },
          user: { select: { email: true, name: true, profilePicture: true } },
        },
      });

      if (!applications.length) break; // no more applications

      for (const app of applications) {
        if (!uniqueCVs.has(app.cv.id)) {
          uniqueCVs.set(app.cv.id, {
            ...app.cv,
            appliedJob: app.job,
            applicant: app.user,
            appliedAt: app.appliedAt,
            applicationId: app.id,
          });
        }
        if (uniqueCVs.size === limit) break; // stop if limit reached
      }

      skip += batchSize;
    }

    return successResponse(
      Array.from(uniqueCVs.values()),
      'Recent CVs fetched successfully',
    );
  }

  @HandleError('Failed to get CV', 'CV')
  async getCvById(id: string): Promise<TResponse<any>> {
    const cv = await this.prisma.client.cV.findUnique({
      where: { id },
      include: {
        experiences: true,
        educations: true,
        customCV: true,
        customCoverLetter: true,
        user: {
          select: {
            email: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!cv) {
      throw new AppError(HttpStatus.NOT_FOUND, 'CV not found');
    }

    const processedCv = await this.processCvProfile(cv);

    return successResponse(processedCv, 'CV fetched successfully');
  }

  @HandleError('Failed to compare CVs', 'CV')
  async compareCVs(dto: CompareCvDto): Promise<TResponse<any>> {
    const { cvId1, cvId2 } = dto;

    const [cv1, cv2] = await this.prisma.client.$transaction([
      this.prisma.client.cV.findUnique({
        where: { id: cvId1 },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
          customCoverLetter: true,
          user: {
            select: {
              email: true,
              name: true,
              profilePicture: true,
            },
          },
        },
      }),
      this.prisma.client.cV.findUnique({
        where: { id: cvId2 },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
          customCoverLetter: true,
          user: {
            select: {
              email: true,
              name: true,
              profilePicture: true,
            },
          },
        },
      }),
    ]);

    if (!cv1 || !cv2) {
      throw new AppError(HttpStatus.NOT_FOUND, 'One or both CVs not found');
    }

    const [processedCv1, processedCv2] = await Promise.all([
      this.processCvProfile(cv1),
      this.processCvProfile(cv2),
    ]);

    return successResponse(
      { cv1: processedCv1, cv2: processedCv2 },
      'CVs compared successfully',
    );
  }

  private async processCvProfile(cv: any) {
    if (!cv) return null;

    const user = cv.user;
    const flatUser = {
      name: user?.name,
      email: user?.email,
      profileUrl: user?.profilePicture?.url || null,
    };

    // Remove the original user object with nested profilePicture
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user: _, ...rest } = cv;

    return {
      ...rest,
      user: flatUser,
    };
  }
}
