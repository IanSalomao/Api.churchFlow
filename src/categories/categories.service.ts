import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListCategoriesDto) {
    const { page, limit, type } = query;
    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(type && { type }),
    };

    const [data, total] = await this.prisma.tenant.$transaction([
      this.prisma.tenant.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.tenant.category.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.tenant.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new AppException(
        'RESOURCE_NOT_FOUND',
        'Categoria não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.tenant.category.create({
      data: dto as Prisma.CategoryUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    if (dto.type !== undefined) {
      throw new AppException(
        'CATEGORY_TYPE_IMMUTABLE',
        'O tipo de uma categoria não pode ser alterado após a criação.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return this.prisma.tenant.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tenant.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Categoria excluída com sucesso.' };
  }
}
