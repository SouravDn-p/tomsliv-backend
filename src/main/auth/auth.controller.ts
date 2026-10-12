import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  GetUser,
  ValidateAdmin,
  ValidateAuth,
  ValidateFarmOwner,
  ValidateUser,
} from '@/core/jwt/jwt.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { LogoutDto, RefreshTokenDto } from './dto/logout.dto';
import {
  AdminNotificationSettingsDto,
  FarmOwnerNotificationSettingsDto,
  UserNotificationSettingsDto,
} from './dto/notification-setting.dto';
import { ResendOtpDto, VerifyOTPDto } from './dto/otp.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import { FarmRegisterDto, RegisterDto } from './dto/register.dto';
import { UpdateFarmDto, UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGetProfileService } from './services/auth-get-profile.service';
import { AuthLoginService } from './services/auth-login.service';
import { AuthLogoutService } from './services/auth-logout.service';
import { AuthNotificationService } from './services/auth-notification.service';
import { AuthOtpService } from './services/auth-otp.service';
import { AuthPasswordService } from './services/auth-password.service';
import { AuthRegisterService } from './services/auth-register.service';
import { AuthUpdateProfileService } from './services/auth-update-profile.service';

@ApiTags('Auth & Settings')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authRegisterService: AuthRegisterService,
    private readonly authLoginService: AuthLoginService,
    private readonly authLogoutService: AuthLogoutService,
    private readonly authOtpService: AuthOtpService,
    private readonly authPasswordService: AuthPasswordService,
    private readonly authGetProfileService: AuthGetProfileService,
    private readonly authUpdateProfileService: AuthUpdateProfileService,
    private readonly authNotificationService: AuthNotificationService,
  ) {}

  @ApiOperation({ summary: 'User Registration' })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authRegisterService.register(body);
  }

  @ApiOperation({ summary: 'Farm Owner Registration' })
  @Post('register-farm')
  async registerFarm(@Body() body: FarmRegisterDto) {
    return this.authRegisterService.farmRegister(body);
  }

  @ApiOperation({ summary: 'Verify OTP (type VERIFICATION or RESET)' })
  @Post('verify-otp')
  async verifyEmail(@Body() body: VerifyOTPDto) {
    return this.authOtpService.verifyOTP(body);
  }

  @ApiOperation({ summary: 'Resend OTP to Email (type VERIFICATION or RESET)' })
  @Post('resend-otp')
  async resendOtp(@Body() body: ResendOtpDto) {
    return this.authOtpService.resendOtp(body);
  }

  @ApiOperation({ summary: 'User Login' })
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authLoginService.login(body);
  }

  @ApiOperation({ summary: 'User Logout' })
  @ApiBearerAuth()
  @Post('logout')
  @ValidateAuth()
  async logOut(@GetUser('sub') userId: string, @Body() dto: LogoutDto) {
    return this.authLogoutService.logout(userId, dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authLogoutService.refresh(dto);
  }

  @ApiOperation({ summary: 'Change Password' })
  @ApiBearerAuth()
  @Post('password/change')
  @ValidateAuth()
  async changePassword(
    @GetUser('sub') userId: string,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authPasswordService.changePassword(userId, body);
  }

  @ApiOperation({ summary: 'Forgot Password' })
  @Post('password/forgot')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authPasswordService.forgotPassword(body.email);
  }

  @ApiOperation({ summary: 'Reset Password' })
  @Post('password/reset')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authPasswordService.resetPassword(body);
  }

  @ApiOperation({ summary: 'Get User Profile' })
  @ApiBearerAuth()
  @Get('profile')
  @ValidateAuth()
  async getProfile(@GetUser('sub') userId: string) {
    return this.authGetProfileService.getProfile(userId);
  }

  @ApiOperation({ summary: 'Update profile' })
  @ApiBearerAuth()
  @Patch('profile')
  @ValidateAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @GetUser('sub') id: string,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authUpdateProfileService.updateProfile(id, dto, file);
  }

  @ApiOperation({ summary: 'Update Farm Owner Notification Settings' })
  @ApiBearerAuth()
  @Patch('notifications/farm-owner')
  @ValidateFarmOwner()
  async updateFarmOwnerNotificationSettings(
    @GetUser('sub') userId: string,
    @Body() dto: FarmOwnerNotificationSettingsDto,
  ) {
    return this.authNotificationService.updateFarmOwnerSettings(userId, dto);
  }

  @ApiOperation({ summary: 'Update User Notification Settings' })
  @ApiBearerAuth()
  @Patch('notifications/user')
  @ValidateUser()
  async updateUserNotificationSettings(
    @GetUser('sub') userId: string,
    @Body() dto: UserNotificationSettingsDto,
  ) {
    return this.authNotificationService.updateUserSettings(userId, dto);
  }

  @ApiOperation({ summary: 'Update Admin Notification Settings' })
  @ApiBearerAuth()
  @Patch('notifications/admin')
  @ValidateAdmin()
  async updateAdminNotificationSettings(
    @GetUser('sub') userId: string,
    @Body() dto: AdminNotificationSettingsDto,
  ) {
    return this.authNotificationService.updateAdminNotificationSettings(
      userId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Update farm profile' })
  @ApiBearerAuth()
  @Patch('farm')
  @ValidateFarmOwner()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async updateFarm(
    @GetUser('sub') userId: string,
    @Body() dto: UpdateFarmDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authUpdateProfileService.updateFarm(userId, dto, file);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiBearerAuth()
  @ValidateAuth()
  async getNotifications(
    @GetUser('sub') userId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.authNotificationService.findAll(userId, dto);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiBearerAuth()
  @ValidateAuth()
  async getUnreadCount(@GetUser('sub') userId: string) {
    return this.authNotificationService.getUnreadCount(userId);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiBearerAuth()
  @ValidateAuth()
  async markAllAsRead(@GetUser('sub') userId: string) {
    return this.authNotificationService.markAllAsRead(userId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiBearerAuth()
  @ValidateAuth()
  async markAsRead(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.authNotificationService.markAsRead(userId, id);
  }

  @Delete('self/delete')
  @ApiOperation({ summary: 'Delete self account' })
  @ApiBearerAuth()
  @ValidateAuth()
  async deleteNotification(@GetUser('sub') userId: string) {
    return this.authUpdateProfileService.deleteSelfAccount(userId);
  }
}
