import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { AuthMailService } from './services/auth-mail.service';
import { ShortlistMailService } from './services/shortlist-mail.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailService, AuthMailService, ShortlistMailService],
  exports: [MailService, AuthMailService, ShortlistMailService],
})
export class MailModule {}
