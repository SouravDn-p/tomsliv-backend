import { QueueName } from '@/common/enum/queue-name.enum';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ApplicationAIEventsService } from './events/application-ai-events.service';
import { GenericEventsService } from './events/generic-events.service';
import { NotificationEventsService } from './events/notification-events.service';
import { QueueGateway } from './queue.gateway';
import { ApplicationAITriggerService } from './trigger/application-ai-trigger.service';
import { GenericTriggerService } from './trigger/generic-trigger.service';
import { ApplicationAIWorkerService } from './worker/application-ai-worker.service';
import { GenericWorkerService } from './worker/generic-worker.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueName.NOTIFICATION },
      { name: QueueName.GENERIC },
      { name: QueueName.APPLICATION_AI },
    ),
  ],
  providers: [
    QueueGateway,
    GenericTriggerService,
    GenericEventsService,
    GenericWorkerService,
    ApplicationAITriggerService,
    ApplicationAIEventsService,
    ApplicationAIWorkerService,
    NotificationEventsService,
  ],
  exports: [BullModule, ApplicationAITriggerService],
})
export class QueueModule {}
