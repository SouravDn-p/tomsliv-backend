import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { Farm, FileInstance, NotificationSettings, UserRole } from '@prisma';

@Injectable()
export class AuthGetProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
  ) {}

  @HandleError("Can't get user profile")
  async getProfile(userId: string) {
    const user = await this.findUserBy('id', userId);
    return user;
  }

  private async findUserBy(
    key: 'id' | 'email',
    value: string,
  ): Promise<TResponse<any>> {
    const where: any = {};
    where[key] = value;

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where,
      include: {
        farm: {
          include: {
            logo: true,
          },
        },
        notificationSettings: true,
        profilePicture: true,
      },
    });

    // Extract only the main user fields
    const { notificationSettings, farm, ...mainUser } = user;

    const sanitizedUser = await this.authUtils.sanitizeUser(mainUser);

    // Format notification settings based on user role
    const formattedNotificationSettings = this.formatNotificationSettings(
      sanitizedUser.role,
      notificationSettings,
    );

    // Build final response
    const data = {
      ...sanitizedUser,
      ...(user.role === 'FARM_OWNER' &&
        farm && {
          farm: this.formatFarmData(farm),
        }),
      notificationSettings: formattedNotificationSettings,
    };

    return successResponse(data, 'User data fetched successfully');
  }

  private formatNotificationSettings(
    userRole: UserRole,
    settings: NotificationSettings | null,
  ) {
    if (!settings) return null;

    const common = {
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
    };

    if (userRole === 'FARM_OWNER') {
      return {
        ...common,
        newApplicantAlert: settings.newApplicantAlert,
        updatesAndTips: settings.updatesAndTips,
      };
    }

    if (userRole === 'USER') {
      return {
        ...common,
        newRelatedJobsAlert: settings.newRelatedJobsAlert,
      };
    }

    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return {
        ...common,
        newEmployerJoin: settings.newEmployerJoin,
      };
    }

    return common;
  }

  private formatFarmData(farm: Farm & { logo: FileInstance | null }) {
    if (!farm) return null;

    const logoUrl = farm.logoId && farm.logo ? (farm.logo.url ?? null) : null;

    return {
      ...farm,
      logoId: farm.logoId ?? null,
      logo: logoUrl,
    };
  }
}
