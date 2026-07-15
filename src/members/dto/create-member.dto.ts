import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsAfterOrEqualDate } from '../../common/decorators/is-after-or-equal-date.decorator';

export class CreateMemberDto {
  @ApiProperty({ description: 'Nome do membro', example: 'João da Silva' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento (ISO 8601)',
    example: '1990-05-20',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data de nascimento válida.' })
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Data de batismo (ISO 8601)',
    example: '2010-12-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data de batismo válida.' })
  @IsAfterOrEqualDate('birthDate', {
    message: 'A data de nascimento não pode ser posterior à data de batismo.',
  })
  baptismDate?: string;

  @ApiPropertyOptional({
    description: 'E-mail de contato',
    example: 'joao@exemplo.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefone de contato',
    example: '(11) 99999-0000',
  })
  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto.' })
  phone?: string;
}
