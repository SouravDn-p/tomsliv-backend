import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma';
import { GetJobSeekersDto } from '../dto/get-farm.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Unable to get all users')
  async getAllUsers(dto: GetJobSeekersDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      farmId: null,
      role: 'USER',
    };

    if (dto?.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [jobSeekers, total] = await this.prisma.client.$transaction([
      this.prisma.client.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          savedCV: {
            include: {
              experiences: true,
              educations: true, // include education
            },
          },
          jobApplications: true,
        },
      }),
      this.prisma.client.user.count({ where }),
    ]);

    const transformed = jobSeekers.map((user) => {
      const cv = user?.savedCV;

      // Total jobs applied
      const totalJobsApplied = user.jobApplications?.length ?? 0;

      // Experience: latest experience or N/A
      let experience = 'N/A';
      if (cv && cv?.experiences?.length > 0) {
        const latestExp = cv.experiences.sort(
          (a, b) => b.startDate.getTime() - a.startDate.getTime(),
        )[0];
        experience = `${latestExp.jobTitle} at ${latestExp.company}`;
      }

      // Highest education
      let highestEducation = 'Not applicable';
      if (cv && cv?.educations?.length > 0) {
        const latestEdu = cv.educations.sort(
          (a, b) => (b?.endDate?.getTime() ?? 0) - (a?.endDate?.getTime() ?? 0),
        )[0];
        highestEducation = `${latestEdu.degree} from ${latestEdu.institution}`;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        totalJobsApplied,
        experience,
        highestEducation,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return successPaginatedResponse(
      transformed,
      { page, limit, total },
      'Successfully found',
    );
  }

  @HandleError('Unable to get user')
  async getSingleUserWithApplicationHistory(userId: string) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        savedCV: {
          include: {
            customCV: true,
            experiences: true,
            educations: true,
          },
        },
        profilePicture: true,
        jobApplications: {
          include: {
            job: {
              include: {
                farm: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      profileUrl: user?.profilePicture?.url ?? null,
      createdAt: user.createdAt,

      totalApplications: user._count.jobApplications,

      savedCV: user.savedCV
        ? {
            id: user.savedCV.id,
            isSaved: user.savedCV.isSaved,

            firstName: user.savedCV.firstName,
            lastName: user.savedCV.lastName,
            email: user.savedCV.email,
            phone: user.savedCV.phone,
            location: user.savedCV.location,
            summary: user.savedCV.summary,

            jobTitle: user.savedCV.jobTitle,
            jobType: user.savedCV.jobType,
            availability: user.savedCV.availability,

            hasDrivingLicense: user.savedCV.hasDrivingLicense,
            eligibleToWorkInNZ: user.savedCV.eligibleToWorkInNZ,
            workPermitType: user.savedCV.workPermitType,

            customCV: user.savedCV.customCV
              ? {
                  id: user.savedCV.customCV.id,
                  fileName: user.savedCV.customCV.originalFilename,
                  fileUrl: user.savedCV.customCV.url,
                  mimeType: user.savedCV.customCV.mimeType,
                }
              : null,

            experiences: user.savedCV.experiences.map((exp) => ({
              id: exp.id,
              jobTitle: exp.jobTitle,
              jobType: exp.jobType,
              company: exp.company,
              summary: exp.summary,
              startDate: exp.startDate,
              endDate: exp.endDate,
              isOngoing: exp.isOngoing,
            })),

            educations: user.savedCV.educations.map((edu) => ({
              id: edu.id,
              degree: edu.degree,
              institution: edu.institution,
              startDate: edu.startDate,
              endDate: edu.endDate,
              isOngoing: edu.isOngoing,
            })),

            createdAt: user.savedCV.createdAt,
            updatedAt: user.savedCV.updatedAt,
          }
        : null,

      applicationHistory: user.jobApplications.map((app) => ({
        id: app.id,
        status: app.status,
        appliedAt: app.appliedAt,

        job: {
          id: app.job.id,
          title: app.job.title,
          employmentType: app.job.jobType,
          location: app.job.location ?? null,
          createdAt: app.job.createdAt,
          updatedAt: app.job.updatedAt,
        },

        farm: app.job.farm
          ? {
              id: app.job.farm.id,
              name: app.job.farm.name,
              location: app.job.farm.location ?? null,
            }
          : null,
      })),
    };

    return successResponse(response, 'Successfully found');
  }

  @HandleError('Unable to toggle user suspension')
  async toggleSuspension(userId: string) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.status === 'ACTIVE') {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { status: 'INACTIVE' },
      });
    } else {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    }

    return successResponse(null, 'User status updated successfully');
  }
}
