import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary:
      'Cria a conta da igreja e retorna um token já autenticado (conta ativa imediatamente, sem confirmação de e-mail)',
  })
  @ApiCreatedResponse({
    description: 'Conta criada; retorna token e dados da igreja.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Autentica a igreja e retorna o token de acesso; rememberMe define a expiração (24h ou 30 dias)',
  })
  @ApiOkResponse({ description: 'Retorna token e expiresAt.' })
  @ApiUnauthorizedResponse({
    description: 'INVALID_CREDENTIALS — e-mail ou senha incorretos.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Inicia a recuperação de senha: gera token de uso único (1h), invalida o anterior e envia o link por e-mail',
  })
  @ApiOkResponse({
    description:
      'Resposta genérica idêntica exista ou não a conta (não vaza e-mails cadastrados).',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Define a nova senha a partir do token recebido por e-mail',
  })
  @ApiOkResponse({ description: 'Senha alterada com sucesso.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
