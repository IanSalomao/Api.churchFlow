import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { ListMembersDto } from './dto/list-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListMembersDto) {
    const { page, limit, search } = query;
    const where: Prisma.MemberWhereInput = {
      deletedAt: null,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await this.prisma.tenant.$transaction([
      this.prisma.tenant.member.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.tenant.member.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const member = await this.prisma.tenant.member.findFirst({
      where: { id, deletedAt: null },
    });
    if (!member) {
      throw new AppException(
        'MEMBER_NOT_FOUND',
        'Membro não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return member;
  }

  create(dto: CreateMemberDto) {
    return this.prisma.tenant.member.create({
      data: this.toPrismaData(dto) as Prisma.MemberUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdateMemberDto) {
    await this.findOne(id);
    return this.prisma.tenant.member.update({
      where: { id },
      data: this.toPrismaData(dto),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tenant.member.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Membro removido.' };
  }

  private toPrismaData(dto: CreateMemberDto | UpdateMemberDto) {
    return {
      ...dto,
      ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
      ...(dto.baptismDate && { baptismDate: new Date(dto.baptismDate) }),
    };
  }
}
