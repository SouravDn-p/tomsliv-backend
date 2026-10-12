import {
  successPaginatedResponse,
  TResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  FarmOwnerApplicationSortOptionEnum,
  GetFarmOwnerApplicationsDto,
} from '../dto/get-farm-owner-applications.dto';

@Injectable()
export class GetFarmOwnerApplicationsService {
  private readonly logger = new Logger(GetFarmOwnerApplicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get farm owner applications', 'JobApplication')
  async getApplications(
    userId: string,
    dto: GetFarmOwnerApplicationsDto,
  ): Promise<TResponse<any>> {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    // 1. Verify user has a farm
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { farm: true },
    });

    const farm = user.farm;
    if (!farm) {
      this.logger.warn(`User with ID ${userId} has no associated farm.`);
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    // 2. Build where clause
    const where: any = {
      job: {
        farmId: farm.id,
      },
    };

    if (dto.jobId) {
      where.jobId = dto.jobId;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.search) {
      where.OR = [
        // Search by Job Title
        {
          job: {
            title: { contains: dto.search, mode: 'insensitive' },
          },
        },
        // Search by CV Name (Saved CV)
        {
          cv: {
            OR: [
              { firstName: { contains: dto.search, mode: 'insensitive' } },
              { lastName: { contains: dto.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // 3. Build sort clause
    let orderBy: any = { appliedAt: 'desc' }; // default

    if (dto.sortOption) {
      switch (dto.sortOption) {
        case FarmOwnerApplicationSortOptionEnum.MOST_RECENT:
          orderBy = { appliedAt: 'desc' };
          break;
        case FarmOwnerApplicationSortOptionEnum.FIT_SCORE_HIGH_TO_LOW:
          orderBy = { applicationAIResults: { jobFitScore: 'desc' } };
          break;
        case FarmOwnerApplicationSortOptionEnum.FIT_SCORE_LOW_TO_HIGH:
          orderBy = { applicationAIResults: { jobFitScore: 'asc' } };
          break;
        case FarmOwnerApplicationSortOptionEnum.EXPERIENCE_HIGH_TO_LOW:
          orderBy = { job: { requiredExperience: 'desc' } };
          break;
        case FarmOwnerApplicationSortOptionEnum.EXPERIENCE_LOW_TO_HIGH:
          orderBy = { job: { requiredExperience: 'asc' } };
          break;
      }
    }

    // 4. Execute Query
    const [total, applications] = await this.prisma.client.$transaction([
      this.prisma.client.jobApplication.count({ where }),
      this.prisma.client.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          job: true,
          cv: {
            include: {
              customCV: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profilePictureId: true,
              profilePicture: true,
            },
          },
          applicationAIResults: true,
        },
      }),
    ]);

    return successPaginatedResponse(
      applications,
      {
        page,
        limit,
        total,
      },
      'Applications fetched successfully',
    );
  }
}
