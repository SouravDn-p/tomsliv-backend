import { ENVEnum } from '@/common/enum/env.enum';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CompareCvDto } from '../dto/compare-cv.dto';

@Injectable()
export class CvComparisonService {
  private readonly AI_URL: string;
  private readonly logger = new Logger(CvComparisonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.AI_URL = this.configService.getOrThrow<string>(ENVEnum.AI_URL);
  }

  @HandleError('Failed to compare CVs', 'CV')
  async compareCVs(dto: CompareCvDto): Promise<TResponse<any>> {
    const { cvId1, cvId2 } = dto;

    // Fetch CVs
    const [cv1, cv2] = await this.prisma.client.$transaction([
      this.prisma.client.cV.findUnique({
        where: { id: cvId1 },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
          customCoverLetter: true,
          user: { select: { name: true, email: true, profilePicture: true } },
        },
      }),
      this.prisma.client.cV.findUnique({
        where: { id: cvId2 },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
          customCoverLetter: true,
          user: { select: { name: true, email: true, profilePicture: true } },
        },
      }),
    ]);

    if (!cv1 || !cv2) {
      throw new AppError(HttpStatus.NOT_FOUND, 'One or both CVs not found');
    }

    // Transform CVs for AI
    const aiPayload = {
      cv_a: this.transformCvToAiFormat(cv1),
      cv_b: this.transformCvToAiFormat(cv2),
    };

    // Call AI
    const aiResult = await this.callAiCompareEndpoint(aiPayload);

    // Generate your own comparison summary
    const comparison = this.generateComparisonData(cv1, cv2);

    // Merge AI result + your comparison
    const result = {
      cv1: comparison.cv1,
      cv2: comparison.cv2,
      aiResult,
    };

    return successResponse(result, 'CVs compared successfully');
  }

  // ---------------- Helpers ----------------

  /** Flatten and generate comparative strengths */
  private generateComparisonData(cvA: any, cvB: any) {
    const processedCvA = this.processCvProfile(cvA);
    const processedCvB = this.processCvProfile(cvB);

    // Extract strengths
    const strengthsA = this.extractStrengths(cvA);
    const strengthsB = this.extractStrengths(cvB);

    // Unique skills
    const uniqueSkillsA = this.extractUniqueSkills(cvA);
    const uniqueSkillsB = this.extractUniqueSkills(cvB);

    // Simple comparative fit score based on experience count
    const fitComparisonScore =
      (cvA.experiences.length /
        (cvA.experiences.length + cvB.experiences.length)) *
      100;

    return {
      cv1: {
        ...processedCvA,
        strengths: strengthsA,
        uniqueSkills: uniqueSkillsA,
      },
      cv2: {
        ...processedCvB,
        strengths: strengthsB,
        uniqueSkills: uniqueSkillsB,
      },
      fitComparisonScore: Math.round(fitComparisonScore),
    };
  }

  private extractStrengths(cv: any): string[] {
    const strengths: string[] = [];

    if (cv.experiences.length) {
      strengths.push(`${cv.experiences.length} years of experience`);
    }

    if (cv.educations.length) {
      strengths.push(`${cv.educations.length} education qualifications`);
    }

    if (cv.summary) {
      strengths.push(cv.summary);
    }

    return strengths;
  }

  private extractUniqueSkills(cv: any): string[] {
    const skills = this.extractSkills(cv);
    return Array.from(new Set(skills));
  }

  /** Flatten CV user data */
  private processCvProfile(cv: any) {
    const user = cv.user;
    const flatUser = {
      name: user?.name,
      email: user?.email,
      profileUrl: user?.profilePicture?.url || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user: _, ...rest } = cv;
    return { ...rest, user: flatUser };
  }

  /** Convert CV to AI schema */
  private transformCvToAiFormat(cv: any) {
    return {
      name: `${cv.firstName} ${cv.lastName}`,
      cv_url: cv.customCV?.url || '',
      cover_letter_url: cv.customCoverLetter?.url || '',
      skills: this.extractSkills(cv),
      certifications: cv.educations?.map((e: any) => e.degree) || [],
      work_experience: cv.experiences.map((exp: any) => ({
        role: exp.jobTitle,
        duration: this.formatDuration(
          exp.startDate,
          exp.endDate,
          exp.isOngoing,
        ),
        responsibilities: this.splitResponsibilities(exp.summary),
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

  private splitResponsibilities(summary: string): string[] {
    if (!summary) return [];
    return summary
      .split(/[\n•-]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private async callAiCompareEndpoint(payload: any) {
    if (!this.AI_URL) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'AI server URL is not configured',
      );
    }

    try {
      const { data } = await axios.post(`${this.AI_URL}/compare-cvs`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      });
      return data;
    } catch (err: unknown) {
      let message = 'AI CV comparison service failed';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || err.message || message;
        this.logger.error(
          'AI CV comparison service failed',
          err.response?.data || err.message,
        );
      } else if (err instanceof Error) {
        message = err.message;
        this.logger.error('AI CV comparison service failed', err);
      } else {
        this.logger.error('AI CV comparison service failed', err);
      }

      throw new AppError(HttpStatus.BAD_GATEWAY, message);
    }
  }
}
