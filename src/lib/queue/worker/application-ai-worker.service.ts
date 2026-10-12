import { ENVEnum } from '@/common/enum/env.enum';
import { QueueName } from '@/common/enum/queue-name.enum';
import { S3Service } from '@/lib/file/services/s3.service';
import { ShortlistMailService } from '@/lib/mail/services/shortlist-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { ApplicationAIPayload } from '../interface/application-ai.payload';

@Processor(QueueName.APPLICATION_AI, { concurrency: 30 })
export class ApplicationAIWorkerService extends WorkerHost {
  private readonly logger = new Logger(ApplicationAIWorkerService.name);
  private readonly AI_URL: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shortlistMailService: ShortlistMailService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {
    super();
    this.AI_URL = this.configService.get<string>(ENVEnum.AI_URL) || '';
  }

  async process(job: Job<ApplicationAIPayload>): Promise<void> {
    this.logger.log(`Processing job`, JSON.stringify(job, null, 2));

    const { applicationId, triggerReason } = job.data;

    this.logger.log(
      `Processing AI analysis for application ${applicationId}, trigger: ${triggerReason}`,
    );

    try {
      if (triggerReason === 'application-shortlisted') {
        await this.handleShortlistEmail(applicationId);
        return;
      }

      if (!applicationId) {
        this.logger.warn(
          `No application ID provided for AI analysis, skipping`,
        );
        return;
      }

      // Fetch application with CV, job, and user details
      const application = await this.prisma.client.jobApplication.findUnique({
        where: { id: applicationId },
        include: {
          cv: {
            include: {
              experiences: true,
              educations: true,
              customCV: true,
              customCoverLetter: true,
            },
          },
          job: { include: { farm: true, idealCandidates: true } },
          user: { select: { name: true, email: true } },
          applicationAIResults: true,
        },
      });

      if (!application || !application.cv || !application.job) {
        throw new Error(
          `Missing application, CV, or job for application ${applicationId}`,
        );
      }

      // Fetch ideal candidate if exists
      const idealCandidate = application.job.idealCandidates
        ? await this.prisma.client.idealCandidate.findUnique({
            where: { id: application.job.idealCandidates.id },
          })
        : null;

      // Build payloads for AI
      const jobDetails = {
        title: application.job.title,
        description: application.job.description,
        location:
          application.job.location || application.job.farm?.name || 'N/A',
        type: application.job.jobType || 'N/A',
        requirements: [], // can extend if you have job requirements stored
      };

      const idealCandidatePayload = idealCandidate
        ? {
            experience: `${idealCandidate.minimumExperienceYears} years`,
            skills: idealCandidate.coreSkills,
            nonNegotiableSkills: idealCandidate.nonNegotiableSkills,
            personalityTraits: idealCandidate.desiredPersonalityTraits,
            recruiterValues: idealCandidate.recruiterValues,
            recruiterHobbies: idealCandidate.recruiterHobbies,
            recruiterPassions: idealCandidate.recruiterPassions,
          }
        : '';

      const cvJson = this.transformCvForAi(application.cv);

      // Call AI endpoint - pass raw CV model as requested
      const aiResult = await this.callAiEndpoint(
        jobDetails,
        idealCandidatePayload,
        application.cv, // Passing raw Prisma CV model
        cvJson, // Still passing transformed version for file metadata
      );

      this.logger.log(
        `AI result for application ${applicationId}:`,
        JSON.stringify(aiResult, null, 2),
      );

      // Save or update AI result
      await this.prisma.client.applicationAIResult.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          summary: aiResult.AI_generated_summary,
          motivation: aiResult.cover_letter_insights?.motivation || '',
          jobFitScore: aiResult.AI_fit_score?.score || 0,
          suggestedQuestions:
            aiResult.AI_suggested_interview_questions?.questions || [],
          strengths: aiResult.strengths || [],
          areasOfImprovement: aiResult.areas_of_development || [],
          keyTraits: aiResult.cover_letter_insights?.key_traits || [],
        },
        update: {
          summary: aiResult.AI_generated_summary,
          motivation: aiResult.cover_letter_insights?.motivation || '',
          jobFitScore: aiResult.AI_fit_score?.score || 0,
          suggestedQuestions:
            aiResult.AI_suggested_interview_questions?.questions || [],
          strengths: aiResult.strengths || [],
          areasOfImprovement: aiResult.areas_of_development || [],
          keyTraits: aiResult.cover_letter_insights?.key_traits || [],
        },
      });

      // Hydrate CV with extracted data for future comparisons
      await this.hydrateCvFromAiResult(application.cv.id, aiResult);

      this.logger.log(`AI analysis completed for application ${applicationId}`);
    } catch (err) {
      this.logger.error(
        `Job ${job.id} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  private transformCvForAi(cv: any) {
    return {
      name: `${cv.firstName} ${cv.lastName}`,
      email: cv.email,
      phone: cv.phone,
      location: cv.location,
      summary: cv.summary || '',
      job_title: cv.jobTitle || '',
      job_type: cv.jobType || '',
      cv_url: cv.customCV?.url || '',
      cv_path: cv.customCV?.path || '',
      cv_mime_type: cv.customCV?.mimeType || 'application/pdf',
      cv_filename: cv.customCV?.originalFilename || 'cv.pdf',
      cover_letter_url: cv.customCoverLetter?.url || '',
      cl_path: cv.customCoverLetter?.path || '',
      cl_mime_type: cv.customCoverLetter?.mimeType || 'application/pdf',
      cl_filename: cv.customCoverLetter?.originalFilename || 'cover_letter.pdf',
      skills: this.extractSkills(cv),
      certifications: cv.educations?.map((e: any) => e.degree) || [],
      work_experience: cv.experiences.map((exp: any) => ({
        role: exp.jobTitle,
        duration: this.formatDuration(
          exp.startDate,
          exp.endDate,
          exp.isOngoing,
        ),
        responsibilities: exp.summary
          ? exp.summary
              .split(/[\n•-]/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
      })),
    };
  }

  private extractSkills(cv: any): string[] {
    const sources: string[] = [
      cv.jobTitle,
      cv.summary,
      ...cv.experiences.map((e: any) => e.summary),
    ].filter((s): s is string => typeof s === 'string');

    return [
      ...new Set(
        sources
          .join(' ')
          .split(/[,.\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 3),
      ),
    ];
  }

  private formatDuration(start: Date, end?: Date, isOngoing?: boolean): string {
    const startYear = new Date(start).getFullYear();
    const endYear = isOngoing || !end ? 'Present' : new Date(end).getFullYear();
    return `${startYear}-${endYear}`;
  }

  private async callAiEndpoint(
    jobDetails: any,
    idealCandidate: any,
    cvModel: any,
    cvMetadata: any,
  ) {
    if (!this.AI_URL) throw new Error('AI server URL not configured');

    try {
      const formData = new FormData();
      formData.append('job_details', JSON.stringify(jobDetails));
      formData.append(
        'ideal_candidate',
        idealCandidate ? JSON.stringify(idealCandidate) : '',
      );

      // Build CV data. If we have a file, send empty cv_json to force AI to extract from the file.
      // This matches the successful pattern identified in Swagger testing.
      const cvJsonToSend = cvMetadata.cv_path ? '' : JSON.stringify(cvModel);
      formData.append('cv_json', cvJsonToSend);
      this.logger.log(
        `Payload cv_json: ${cvJsonToSend ? 'Provided' : 'Empty (Forcing File Extraction)'}`,
      );

      // Fetch and append CV file if path exists
      if (cvMetadata.cv_path) {
        try {
          this.logger.log(
            `Fetching CV file from S3 path: ${cvMetadata.cv_path}`,
          );
          const cvBuffer = await this.s3Service.getFileContent(
            cvMetadata.cv_path,
          );
          const cvBlob = new Blob([new Uint8Array(cvBuffer)], {
            type: cvMetadata.cv_mime_type || 'application/pdf',
          });
          formData.append(
            'cv_file',
            cvBlob,
            cvMetadata.cv_filename || 'cv.pdf',
          );
          this.logger.log(
            `CV file appended successfully: ${cvMetadata.cv_filename}`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to fetch CV file from S3 path ${cvMetadata.cv_path}: ${err.message}`,
          );
        }
      }

      // Fetch and append Cover Letter file if path exists
      if (cvMetadata.cl_path) {
        try {
          this.logger.log(
            `Fetching Cover Letter file from S3 path: ${cvMetadata.cl_path}`,
          );
          const clBuffer = await this.s3Service.getFileContent(
            cvMetadata.cl_path,
          );
          const clBlob = new Blob([new Uint8Array(clBuffer)], {
            type: cvMetadata.cl_mime_type || 'application/pdf',
          });
          formData.append(
            'cover_letter_file',
            clBlob,
            cvMetadata.cl_filename || 'cover_letter.pdf',
          );
          this.logger.log(
            `Cover Letter file appended successfully: ${cvMetadata.cl_filename}`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to fetch Cover Letter file from S3 path ${cvMetadata.cl_path}: ${err.message}`,
          );
        }
      }

      this.logger.log(`Calling AI service at ${this.AI_URL}/process-candidate`);

      const response = await fetch(`${this.AI_URL}/process-candidate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `AI service returned error ${response.status}: ${errorText}`,
        );
        throw new Error(`AI service failed with status ${response.status}`);
      }

      const data = await response.json();
      this.logger.log(`AI service response received successfully`);
      return data;
    } catch (err: unknown) {
      let message = 'AI service call failed';
      if (err instanceof Error) {
        message = err.message;
      }
      this.logger.error('AI service failed', err as any);
      throw new Error(message);
    }
  }

  private async handleShortlistEmail(applicationId: string) {
    const application = await this.prisma.client.jobApplication.findUnique({
      where: { id: applicationId },
      include: { cv: true, job: { include: { farm: true } } },
    });

    if (!application || !application.cv || !application.job?.farm) {
      this.logger.warn(
        `Missing data for shortlist email. App: ${applicationId}`,
      );
      return;
    }

    const { cv, job } = application;
    const candidateName = `${cv.firstName} ${cv.lastName}`;

    await this.shortlistMailService.sendShortlistEmail(
      cv.email,
      candidateName,
      job.title,
      job.farm.name,
      undefined,
    );

    this.logger.log(
      `Shortlist email sent to ${cv.email} for application ${applicationId}`,
    );
  }

  private async hydrateCvFromAiResult(cvId: string, aiResult: any) {
    try {
      const cv = await this.prisma.client.cV.findUnique({
        where: { id: cvId },
        include: { experiences: true, educations: true },
      });

      if (!cv) return;

      const dataToUpdate: any = {};

      // 1. Update summary if empty
      if (!cv.summary && aiResult.AI_generated_summary) {
        dataToUpdate.summary = aiResult.AI_generated_summary;
      }

      // 2. Update experiences if empty
      if (cv.experiences.length === 0 && aiResult.work_experience?.length > 0) {
        dataToUpdate.experiences = {
          create: aiResult.work_experience.map((exp: any) => ({
            jobTitle: exp.role || 'NA',
            company: 'NA',
            jobType: 'FULL_TIME',
            summary: Array.isArray(exp.responsibilities)
              ? exp.responsibilities.join('\n')
              : exp.responsibilities || '',
            startDate: this.parseYearFromDuration(exp.duration, true),
            endDate: exp.duration?.toLowerCase().includes('present')
              ? null
              : this.parseYearFromDuration(exp.duration, false),
            isOngoing: exp.duration?.toLowerCase().includes('present') || false,
          })),
        };
      }

      // 3. Update educations if empty
      if (cv.educations.length === 0 && aiResult.certifications?.length > 0) {
        dataToUpdate.educations = {
          create: aiResult.certifications.map((cert: string) => ({
            degree: cert,
            institution: 'NA',
            startDate: new Date(),
            isOngoing: false,
          })),
        };
      }

      if (Object.keys(dataToUpdate).length > 0) {
        await this.prisma.client.cV.update({
          where: { id: cvId },
          data: dataToUpdate,
        });
        this.logger.log(`CV ${cvId} hydrated with AI extracted data`);
      }
    } catch (err) {
      this.logger.warn(`Failed to hydrate CV ${cvId}: ${err.message}`);
    }
  }

  private parseYearFromDuration(duration: string, isStart: boolean): Date {
    try {
      if (!duration) return new Date();
      const years = duration.match(/\d{4}/g);
      if (years && years.length > 0) {
        if (isStart) return new Date(`${years[0]}-01-01`);
        if (years.length > 1) return new Date(`${years[1]}-01-01`);
      }
      return new Date();
    } catch {
      return new Date();
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `AI analysis job ${job.id} completed for application ${job.data.applicationId}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: any) {
    this.logger.error(
      `AI analysis job ${job.id} failed for application ${job.data.applicationId}: ${err?.message}`,
    );
  }
}
