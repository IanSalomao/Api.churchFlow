import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Nome da igreja',
    example: 'Igreja Batista Central',
  })
  @IsString({ message: 'O nome da igreja deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da igreja é obrigatório.' })
  name: string;

  @ApiProperty({
    description: 'E-mail, usado como login',
    example: 'contato@igrejacentral.com.br',
  })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiPropertyOptional({
    description: 'Telefone de contato',
    example: '(11) 99999-0000',
  })
  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto.' })
  phone?: string;

  @ApiProperty({
    description: 'Mínimo de 8 caracteres, sem regra especial de composição',
    minLength: 8,
    example: 'senhaSegura123',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;
}
