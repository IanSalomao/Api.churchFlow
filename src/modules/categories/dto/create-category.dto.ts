import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { TransactionType } from '../../../../generated/prisma/client';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nome da categoria', example: 'Dízimo' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição da categoria',
    example: 'Dízimo mensal dos membros',
  })
  @IsString({ message: 'A descrição deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Tipo da categoria — imutável após a criação',
    enum: TransactionType,
    example: 'income',
  })
  @IsEnum(TransactionType, {
    message: 'O tipo deve ser "income" ou "expense".',
  })
  type!: TransactionType;

  @ApiProperty({
    description: 'Cor usada nos gráficos (hexadecimal)',
    example: '#22C55E',
  })
  @IsString({ message: 'A cor deve ser um texto.' })
  @Matches(HEX_COLOR_REGEX, {
    message: 'A cor deve ser um hexadecimal válido, ex.: #22C55E.',
  })
  color!: string;
}
