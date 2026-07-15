import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../../generated/prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

const BCRYPT_ROUNDS = 10;

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  cnpj: true,
  denomination: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChurchSelect;

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  // Church não é um modelo tenanted (é o próprio tenant) — todo acesso usa
  // prisma.unscoped e escopa manualmente pelo churchId do token autenticado.
  async getProfile(churchId: string) {
    // O JwtAuthGuard já garante, a cada request, que a igreja existe e está
    // ativa — não há caminho para chegar aqui com resultado nulo.
    const church = await this.prisma.unscoped.church.findFirst({
      where: { id: churchId, deletedAt: null },
      select: PROFILE_SELECT,
    });
    return church!;
  }

  async updateProfile(churchId: string, dto: UpdateAccountDto) {
    try {
      return await this.prisma.unscoped.church.update({
        where: { id: churchId },
        data: dto,
        select: PROFILE_SELECT,
      });
    } catch (error) {
      // Mesmo índice único parcial do cadastro (WHERE deleted_at IS NULL):
      // só colide com e-mail de outra conta ativa.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          'EMAIL_ALREADY_IN_USE',
          'Este e-mail já está em uso.',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async changePassword(churchId: string, dto: ChangePasswordDto) {
    await this.assertCurrentPassword(churchId, dto.currentPassword);

    const password = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.unscoped.church.update({
      where: { id: churchId },
      data: { password },
    });
    return { message: 'Senha alterada com sucesso.' };
  }

  async deleteAccount(churchId: string, dto: DeleteAccountDto) {
    await this.assertCurrentPassword(churchId, dto.currentPassword);

    await this.prisma.unscoped.church.update({
      where: { id: churchId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Conta excluída com sucesso.' };
  }

  private async assertCurrentPassword(
    churchId: string,
    currentPassword: string,
  ): Promise<void> {
    const church = await this.prisma.unscoped.church.findFirst({
      where: { id: churchId, deletedAt: null },
      select: { password: true },
    });
    const passwordMatches =
      church && (await bcrypt.compare(currentPassword, church.password));
    if (!passwordMatches) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Senha atual incorreta.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
