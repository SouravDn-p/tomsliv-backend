import { PaginationDto } from '@/common/dto/pagination.dto';
import { successResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { NotificationSettings } from '@prisma';
import {
  AdminNotificationSettingsDto,
  FarmOwnerNotificationSettingsDto,
  UserNotificationSettingsDto,
} from '../dto/notification-setting.dto';

@Injectable()
export class AuthNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Notifications fetched successfully', 'Notifications')
  async findAll(userId: string, dto: PaginationDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.prisma.client.$transaction([
      this.prisma.client.userNotification.findMany({
        where: { userId },
        include: {
          notification: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.userNotification.count({
        where: { userId },
      }),
    ]);

    return successResponse(
      {
        data: notifications,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Notifications fetched successfully',
    );
  }

  @HandleError('Unread count fetched successfully', 'Unread count')
  async getUnreadCount(userId: string) {
    const count = await this.prisma.client.userNotification.count({
      where: {
        userId,
        read: false,
      },
    });

    return successResponse({ count }, 'Unread count fetched');
  }

  @HandleError('Notification marked as read successfully', 'Notification')
  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.client.userNotification.update({
      where: {
        userId_notificationId: {
          userId,
          notificationId,
        },
      },
      data: { read: true },
    });

    return successResponse(null, 'Notification marked as read');
  }

  @HandleError('All notifications marked as read successfully', 'Notification')
  async markAllAsRead(userId: string) {
    await this.prisma.client.userNotification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });

    return successResponse(null, 'All notifications marked as read');
  }

  @HandleError('Farm Owner settings updated', 'NotificationSettings')
  async updateFarmOwnerSettings(
    userId: string,
    dto: FarmOwnerNotificationSettingsDto,
  ) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { notificationSettings: true },
    });

    const updated = await this.prisma.client.notificationSettings.upsert({
      where: { id: user.notificationSettings?.id },
      create: { ...dto },
      update: { ...dto },
    });

    const filtered = this.filterFarmOwnerSettings(updated, userId);

    return successResponse(filtered, 'Farm Owner settings updated');
  }

  @HandleError('User settings updated', 'NotificationSettings')
  async updateUserSettings(userId: string, dto: UserNotificationSettingsDto) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { notificationSettings: true },
    });

    const updated = await this.prisma.client.notificationSettings.upsert({
      where: { id: user.notificationSettings?.id },
      create: { ...dto },
      update: { ...dto },
    });

    const filtered = this.filterUserSettings(updated, userId);

    return successResponse(filtered, 'User settings updated');
  }

  @HandleError('Admin settings updated', 'NotificationSettings')
  async updateAdminNotificationSettings(
    userId: string,
    dto: AdminNotificationSettingsDto,
  ) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { notificationSettings: true },
    });

    const updated = await this.prisma.client.notificationSettings.upsert({
      where: { id: user.notificationSettings?.id },
      create: { ...dto },
      update: { ...dto },
    });

    const filtered = this.filterAdminSettings(updated, userId);

    return successResponse(filtered, 'Admin settings updated');
  }

  private filterFarmOwnerSettings(
    settings: NotificationSettings,
    userId: string,
  ) {
    return {
      id: settings.id,
      userId,
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
      newApplicantAlert: settings.newApplicantAlert,
      updatesAndTips: settings.updatesAndTips,
    };
  }

  private filterUserSettings(settings: NotificationSettings, userId: string) {
    return {
      id: settings.id,
      userId,
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
      newRelatedJobsAlert: settings.newRelatedJobsAlert,
    };
  }

  private filterAdminSettings(settings: NotificationSettings, userId: string) {
    return {
      id: settings.id,
      userId,
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
      newEmployerJoin: settings.newEmployerJoin,
    };
  }
}
