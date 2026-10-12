import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { QueuePayload } from '@/lib/queue/interface/queue.payload';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '@prisma';
import { PRICING_CONFIG } from '../../jobs/constants/pricing.constants';
import { FarmRegisterDto, RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthRegisterService {
  // Constants
  private readonly EARLY_ADOPTER_LIMIT = PRICING_CONFIG.EARLY_ADOPTER_LIMIT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: AuthUtilsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleError('User Registration failed', 'User')
  async register(dto: RegisterDto): Promise<TResponse<any>> {
    const { email, password, name } = dto;

    // Check if user email already exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    // Create new user
    const newUser = await this.prisma.client.user.create({
      data: {
        email,
        name,
        role: UserRole.USER,
        password: await this.utils.hash(password),
        isVerified: true,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        notificationSettings: {
          create: {},
        },
      },
    });

    // Generate token
    const token = await this.utils.generateTokenPairAndSave({
      email,
      role: newUser.role,
      sub: newUser.id,
    });

    // Return sanitized response
    return successResponse(
      {
        loginType: newUser.role,
        user: await this.utils.sanitizeUser(newUser),
        token,
      },
      `Registration successful. Welcome to TomsLiv.`,
    );
  }

  @HandleError('Farm Owner Registration failed', 'Farm Owner')
  async farmRegister(dto: FarmRegisterDto): Promise<TResponse<any>> {
    const { email, password, name, farmName } = dto;

    // Check if user email already exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    // Execute User Creation & Early Adopter Check in Transaction
    const newUser = await this.prisma.client.$transaction(async (tx) => {
      // 1. Check for Early Adopter Availability
      const currentEarlyAdopters = await tx.user.count({
        where: { isEarlyAdopter: true },
      });

      const isEarlyAdopter = currentEarlyAdopters < this.EARLY_ADOPTER_LIMIT;

      // 2. Create User
      return tx.user.create({
        data: {
          email,
          name,
          role: UserRole.FARM_OWNER,
          password: await this.utils.hash(password),
          isVerified: true,
          isEarlyAdopter, // Set status based on availability
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
          farm: {
            create: {
              name: farmName,
            },
          },
          notificationSettings: {
            create: {},
          },
        },
        include: {
          farm: true,
        },
      });
    });

    // Notify Admin & Super Admins
    const superAdmins = await this.prisma.client.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
      include: { notificationSettings: true },
    });

    const recipients = superAdmins
      .filter((admin) => admin.notificationSettings?.newEmployerJoin)
      .map((admin) => ({ id: admin.id }));

    if (recipients.length > 0) {
      const payload: QueuePayload = {
        recipients,
        type: QueueEventsEnum.NOTIFICATION,
        title: 'New Farm Registration',
        message: `${name} has registered a new farm: ${farmName}`,
        createdAt: new Date(),
        meta: {
          performedBy: newUser.id,
          recordType: 'User',
          recordId: newUser.id,
        },
      };

      await this.eventEmitter.emitAsync(QueueEventsEnum.NOTIFICATION, payload);
    }

    // 3. Generate token
    const token = await this.utils.generateTokenPairAndSave({
      email,
      role: newUser.role,
      sub: newUser.id,
    });

    // Return sanitized response
    return successResponse(
      {
        loginType: newUser.role,
        user: await this.utils.sanitizeUser(newUser),
        token,
        farm: newUser.farm,
        isEarlyAdopter: newUser.isEarlyAdopter,
      },
      `Registration successful. Welcome to TomsLiv.`,
    );
  }
}
