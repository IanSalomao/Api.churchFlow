import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail cadastrado',
    example: 'contato@igrejacentral.com.br',
  })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ description: 'Senha da conta', example: 'senhaSegura123' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password: string;

  @ApiPropertyOptional({
    description: 'Se true, o token expira em 30 dias em vez de 24h',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'rememberMe deve ser um booleano.' })
  rememberMe?: boolean;
}
