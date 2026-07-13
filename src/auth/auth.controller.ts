import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
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
}
