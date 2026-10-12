import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserJobsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError("Failed to toggle job's saved status")
  async toggleJobSavedStatus(userId: string, jobId: string) {
    const existingEntry = await this.prisma.client.savedJobs.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    if (existingEntry) {
      // If the job is already saved, remove it from saved jobs
      await this.prisma.client.savedJobs.delete({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });
    } else {
      // If the job is not saved, add it to saved jobs
      await this.prisma.client.savedJobs.create({
        data: {
          userId,
          jobId,
        },
      });
    }

    return successResponse(
      null,
      `${existingEntry ? 'Removed from' : 'Added to'} saved jobs successfully`,
    );
  }

  @HandleError("Failed to get user's saved jobs")
  async getSavedJobsByUser(userId: string, pg: PaginationDto) {
    const page = pg.page && pg.page > 0 ? pg.page : 1;
    const limit = pg.limit && pg.limit > 0 ? pg.limit : 10;
    const skip = (page - 1) * limit;

    const [savedJobs, total] = await this.prisma.client.$transaction([
      this.prisma.client.savedJobs.findMany({
        where: { userId },
        include: {
          job: {
            include: {
              farm: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { savedAt: 'desc' },
      }),
      this.prisma.client.savedJobs.count({
        where: { userId },
      }),
    ]);

    return successPaginatedResponse(
      savedJobs.map((entry) => entry.job),
      {
        page,
        limit,
        total,
      },
      'Fetched saved jobs successfully',
    );
  }
}
