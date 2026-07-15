import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '../../../generated/prisma/enums';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Tipo da transação',
    enum: TransactionType,
    example: TransactionType.income,
  })
  @IsEnum(TransactionType, { message: 'O tipo deve ser income ou expense.' })
  type!: TransactionType;

  @ApiProperty({
    description: 'Valor positivo (magnitude); o sinal é definido pelo type',
    example: 500.0,
  })
  @IsNumber({}, { message: 'O valor deve ser um número.' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  value!: number;

  @ApiProperty({
    description: 'Data da transação (ISO 8601)',
    example: '2026-07-01',
  })
  @IsDateString({}, { message: 'Informe uma data válida.' })
  date!: string;

  @ApiProperty({
    description: 'Categoria da transação — deve ter o mesmo type',
    example: 'd3a8e1d2-0b4c-4d5f-9e1c-3a4b5c6d7e8f',
  })
  @IsUUID('4', { message: 'O id da categoria deve ser um UUID válido.' })
  categoryId!: string;

  @ApiPropertyOptional({
    description: 'Descrição livre',
    example: 'Dízimo do mês',
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Id do membro vinculado',
    example: 'b1e6c9b0-8f2a-4b3e-9c9a-1e2f3a4b5c6d',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O id do membro deve ser um UUID válido.' })
  memberId?: string;

  @ApiPropertyOptional({
    description: 'Id do ministério vinculado',
    example: '111e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O id do ministério deve ser um UUID válido.' })
  ministryId?: string;
}
