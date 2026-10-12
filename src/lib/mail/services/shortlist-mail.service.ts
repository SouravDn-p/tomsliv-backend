import { AppError } from '@/core/error/handle-error.app';
import { Injectable } from '@nestjs/common';
import { MailService } from '../mail.service';
import { shortlistTemplate } from '../templates/shortlist.template';

@Injectable()
export class ShortlistMailService {
  constructor(private readonly mailService: MailService) {}

  async sendShortlistEmail(
    email: string,
    candidateName: string,
    jobTitle: string,
    farmName: string,
    aiContent?: string,
  ) {
    try {
      const html = shortlistTemplate(
        candidateName,
        jobTitle,
        farmName,
        aiContent,
      );

      await this.mailService.sendMail({
        to: email,
        subject: `Update on your application for ${jobTitle}`,
        html,
        text: `Good news, ${candidateName}! You have been shortlisted for ${jobTitle} at ${farmName}.`,
      });
    } catch (error) {
      console.error(error);
      throw new AppError(500, 'Failed to send shortlist email');
    }
  }
}
