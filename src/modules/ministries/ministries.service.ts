import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListMinistriesDto } from './dto/list-ministries.dto';
import { Prisma } from '../../../generated/prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';

@Injectable()
export class MinistriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListMinistriesDto) {
    const { page, limit, search } = query;
    const where: Prisma.MinistryWhereInput = {
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await this.prisma.tenant.$transaction([
      this.prisma.tenant.ministry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.tenant.ministry.count({ where }),
    ]);

    return {
      items: data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const ministry = await this.prisma.tenant.ministry.findFirst({
      where: { id, deletedAt: null },
    });
    if (!ministry) {
      throw new AppException(
        'MINISTRY_NOT_FOUND',
        'Ministério não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return ministry;
  }

  async create(dto: CreateMinistryDto) {
    await this.assertResponsibleExists(dto.responsibleId);
    return this.prisma.tenant.ministry.create({
      data: dto as Prisma.MinistryUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdateMinistryDto) {
    await this.findOne(id);
    await this.assertResponsibleExists(dto.responsibleId);
    return this.prisma.tenant.ministry.update({
      where: { id },
      data: dto,
    });
  }

  private async assertResponsibleExists(responsibleId?: string) {
    if (!responsibleId) {
      return;
    }
    const responsible = await this.prisma.tenant.member.findFirst({
      where: { id: responsibleId, deletedAt: null },
    });
    if (!responsible) {
      throw new AppException(
        'MINISTRY_RESPONSIBLE_NOT_FOUND',
        'Membro responsável não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tenant.ministry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Ministério removido.' };
  }
}
