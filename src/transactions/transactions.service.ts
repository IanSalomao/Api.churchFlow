import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { TransactionType } from '../../generated/prisma/enums';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const TRANSACTION_INCLUDE = {
  category: true,
  member: true,
  ministry: true,
} satisfies Prisma.TransactionInclude;

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof TRANSACTION_INCLUDE;
}>;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListTransactionsDto) {
    const { page, limit, search, dateFrom, dateTo, categoryId, type, sort } =
      query;
    const where: Prisma.TransactionWhereInput = {
      deletedAt: null,
      ...(search && { description: { contains: search, mode: 'insensitive' } }),
      ...(categoryId && { categoryId }),
      ...(type && { type }),
      ...((dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };

    const [data, total] = await this.prisma.tenant.$transaction([
      this.prisma.tenant.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.parseSort(sort),
        include: TRANSACTION_INCLUDE,
      }),
      this.prisma.tenant.transaction.count({ where }),
    ]);

    return {
      data: data.map((transaction) => this.mapTransaction(transaction)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.tenant.transaction.findFirst({
      where: { id, deletedAt: null },
      include: TRANSACTION_INCLUDE,
    });
    if (!transaction) {
      throw new AppException(
        'TRANSACTION_NOT_FOUND',
        'Transação não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.mapTransaction(transaction);
  }

  async create(dto: CreateTransactionDto) {
    await this.assertCategoryMatchesType(dto.categoryId, dto.type);
    if (dto.memberId) {
      await this.assertMemberExists(dto.memberId);
    }
    if (dto.ministryId) {
      await this.assertMinistryExists(dto.ministryId);
    }

    const transaction = await this.prisma.tenant.transaction.create({
      data: {
        type: dto.type,
        value: this.signedValue(dto.type, dto.value),
        date: new Date(dto.date),
        description: dto.description,
        categoryId: dto.categoryId,
        memberId: dto.memberId,
        ministryId: dto.ministryId,
      } as Prisma.TransactionUncheckedCreateInput,
      include: TRANSACTION_INCLUDE,
    });
    return this.mapTransaction(transaction);
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const existing = await this.getActiveOrThrow(id);

    if (dto.type !== undefined || dto.categoryId !== undefined) {
      await this.assertCategoryMatchesType(
        dto.categoryId ?? existing.categoryId,
        dto.type ?? existing.type,
      );
    }
    if (dto.memberId) {
      await this.assertMemberExists(dto.memberId);
    }
    if (dto.ministryId) {
      await this.assertMinistryExists(dto.ministryId);
    }

    const data: Prisma.TransactionUncheckedUpdateInput = {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.date !== undefined && { date: new Date(dto.date) }),
      ...(dto.memberId !== undefined && { memberId: dto.memberId }),
      ...(dto.ministryId !== undefined && { ministryId: dto.ministryId }),
    };

    if (dto.value !== undefined || dto.type !== undefined) {
      const magnitude = dto.value ?? Math.abs(Number(existing.value));
      data.value = this.signedValue(dto.type ?? existing.type, magnitude);
    }

    const transaction = await this.prisma.tenant.transaction.update({
      where: { id },
      data,
      include: TRANSACTION_INCLUDE,
    });
    return this.mapTransaction(transaction);
  }

  async remove(id: string) {
    await this.getActiveOrThrow(id);
    await this.prisma.tenant.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Transação removida.' };
  }

  private async getActiveOrThrow(id: string) {
    const transaction = await this.prisma.tenant.transaction.findFirst({
      where: { id, deletedAt: null },
    });
    if (!transaction) {
      throw new AppException(
        'TRANSACTION_NOT_FOUND',
        'Transação não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return transaction;
  }

  private async assertCategoryMatchesType(
    categoryId: string,
    type: TransactionType,
  ) {
    const category = await this.prisma.tenant.category.findFirst({
      where: { id: categoryId, deletedAt: null },
    });
    if (!category) {
      throw new AppException(
        'CATEGORY_NOT_FOUND',
        'Categoria não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (category.type !== type) {
      throw new AppException(
        'CATEGORY_TYPE_MISMATCH',
        'A categoria selecionada não é do mesmo tipo da transação.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async assertMemberExists(memberId: string) {
    const member = await this.prisma.tenant.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });
    if (!member) {
      throw new AppException(
        'MEMBER_NOT_FOUND',
        'Membro não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async assertMinistryExists(ministryId: string) {
    const ministry = await this.prisma.tenant.ministry.findFirst({
      where: { id: ministryId, deletedAt: null },
    });
    if (!ministry) {
      throw new AppException(
        'MINISTRY_NOT_FOUND',
        'Ministério não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private signedValue(type: TransactionType, magnitude: number): number {
    return type === TransactionType.income ? magnitude : -magnitude;
  }

  private parseSort(sort?: string): Prisma.TransactionOrderByWithRelationInput {
    const raw = sort ?? '-date';
    const desc = raw.startsWith('-');
    const field = desc ? raw.slice(1) : raw;
    return { [field]: desc ? 'desc' : 'asc' };
  }

  private mapTransaction(transaction: TransactionWithRelations) {
    const { category, member, ministry } = transaction;

    return {
      id: transaction.id,
      churchId: transaction.churchId,
      type: transaction.type,
      value: Number(transaction.value),
      date: transaction.date,
      description: transaction.description,
      deletedAt: transaction.deletedAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
        deleted: category.deletedAt !== null,
      },
      member: member
        ? {
            id: member.id,
            name: member.name,
            deleted: member.deletedAt !== null,
          }
        : null,
      ministry: ministry
        ? {
            id: ministry.id,
            name: ministry.name,
            deleted: ministry.deletedAt !== null,
          }
        : null,
    };
  }
}
