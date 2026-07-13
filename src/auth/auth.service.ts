import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
