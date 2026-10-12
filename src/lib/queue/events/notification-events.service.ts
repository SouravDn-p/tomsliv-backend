import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueuePayload } from '../interface/queue.payload';
import { QueueGateway } from '../queue.gateway';

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(private readonly queueGateway: QueueGateway) {}

  @OnEvent(QueueEventsEnum.NOTIFICATION)
  async handleNotificationEvent(payload: QueuePayload) {
    this.logger.log(
      `Received notification event: ${payload.title} for ${payload.recipients?.length} recipients`,
    );

    try {
      const { recipients, ...notificationData } = payload;

      if (!recipients || recipients.length === 0) {
        this.logger.warn('No recipients provided for notification');
        return;
      }

      const userIds = recipients.map((r) => r.id);
      await this.queueGateway.notifyMultipleUsers(
        userIds,
        QueueEventsEnum.NOTIFICATION,
        notificationData,
      );
    } catch (error) {
      this.logger.error('Failed to handle notification event', error);
    }
  }
}
