import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../../generated/prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const BCRYPT_ROUNDS = 10;
// A spec fixa a expiração do link de recuperação em 1h.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const church = await this.prisma.unscoped.church.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      });
      const { token } = await this.signToken(church.id, false);
      return { token, church };
    } catch (error) {
      // O índice único parcial (WHERE deleted_at IS NULL) permite reutilizar
      // e-mail de conta excluída; a colisão só ocorre entre contas ativas.
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

  async login(dto: LoginDto) {
    const church = await this.prisma.unscoped.church.findFirst({
      where: { email: dto.email, deletedAt: null },
      select: { id: true, password: true },
    });
    // 401 idêntico para e-mail inexistente e senha errada — não vazar qual falhou.
    const passwordMatches =
      church && (await bcrypt.compare(dto.password, church.password));
    if (!passwordMatches) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'E-mail ou senha incorretos.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.signToken(church.id, dto.rememberMe ?? false);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Resposta idêntica exista ou não a conta — não vazar e-mails cadastrados.
    const response = {
      message:
        'Se o e-mail informado existir, enviaremos um link de recuperação.',
    };

    const church = await this.prisma.unscoped.church.findFirst({
      where: { email: dto.email, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!church) return response;

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    await this.prisma.unscoped.$transaction([
      // Nunca há dois tokens válidos por igreja: invalida qualquer um ativo.
      this.prisma.unscoped.passwordResetToken.updateMany({
        where: { churchId: church.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      }),
      this.prisma.unscoped.passwordResetToken.create({
        data: {
          churchId: church.id,
          token,
          expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    await this.mailService.sendPasswordReset(church.email, token);
    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.unscoped.passwordResetToken.findUnique(
      {
        where: { token: dto.token },
        select: { id: true, churchId: true, expiresAt: true, usedAt: true },
      },
    );
    const now = new Date();
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      throw new AppException(
        'INVALID_OR_EXPIRED_TOKEN',
        'Este link de recuperação expirou ou já foi utilizado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const password = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.unscoped.$transaction([
      this.prisma.unscoped.church.update({
        where: { id: resetToken.churchId },
        data: { password },
      }),
      this.prisma.unscoped.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
    ]);
    return { message: 'Senha alterada com sucesso.' };
  }

  private async signToken(churchId: string, rememberMe: boolean) {
    // Os typings do jsonwebtoken restringem expiresIn a `ms.StringValue`;
    // o valor vem validado do env como string ("24h"/"30d"), daí o cast.
    const expiresIn = this.config.getOrThrow<string>(
      rememberMe ? 'JWT_EXPIRATION_REMEMBER_ME' : 'JWT_EXPIRATION_DEFAULT',
    ) as JwtSignOptions['expiresIn'];
    const token = await this.jwtService.signAsync(
      { sub: churchId },
      { expiresIn },
    );
    // expiresAt derivado do exp real do token — evita reinterpretar "24h"/"30d".
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000).toISOString() };
  }
}
