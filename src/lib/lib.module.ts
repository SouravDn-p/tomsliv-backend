import { Module } from '@nestjs/common';
import { FileModule } from './file/file.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { SeedModule } from './seed/seed.module';
import { StripeModule } from './stripe/stripe.module';
import { UtilsModule } from './utils/utils.module';

@Module({
  imports: [
    PrismaModule,
    FileModule,
    MailModule,
    SeedModule,
    UtilsModule,
    QueueModule,
    StripeModule,
  ],
  exports: [],
  providers: [],
})
export class LibModule {}
