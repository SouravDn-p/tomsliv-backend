import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { QueueName } from '@/common/enum/queue-name.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { ApplicationAIPayload } from '../interface/application-ai.payload';
import { enqueueJobHelper } from '../utils/queue.utils';

@Injectable()
export class ApplicationAIEventsService {
  private readonly logger = new Logger(ApplicationAIEventsService.name);

  constructor(
    @InjectQueue(QueueName.APPLICATION_AI)
    private readonly applicationAIQueue: Queue,
  ) {}

  @OnEvent(QueueEventsEnum.APPLICATION_AI_ANALYSIS)
  async handleApplicationAIAnalysisEvent(payload: ApplicationAIPayload) {
    await enqueueJobHelper(
      this.applicationAIQueue,
      QueueEventsEnum.APPLICATION_AI_ANALYSIS,
      payload,
      payload.applicationId,
      this.logger,
    );
  }
}
