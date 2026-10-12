import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to create contact')
  async create(dto: CreateContactDto) {
    const created = await this.prisma.client.contact.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
      },
    });
    return successResponse(created, 'Successfully created');
  }

  @HandleError('Failed to find contact')
  async findOne(id: string) {
    const contact = await this.prisma.client.contact.findUnique({
      where: { id },
    });
    return successResponse(contact, 'Successfully found');
  }

  @HandleError('Failed to find all contacts')
  async findAll(query: PaginationDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const contacts = await this.prisma.client.contact.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return successPaginatedResponse(
      contacts,
      {
        page,
        limit,
        total: await this.prisma.client.contact.count(),
      },
      'Successfully found',
    );
  }

  @HandleError('Failed to delete contact')
  async deleteById(id: string) {
    return successResponse(
      this.prisma.client.contact.delete({ where: { id } }),
      'Successfully deleted',
    );
  }
}
