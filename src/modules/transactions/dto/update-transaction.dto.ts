import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '../../../../generated/prisma/enums';

/**
 * Não usa PartialType(CreateTransactionDto): description/memberId/ministryId
 * aceitam `null` explícito para limpar o vínculo (regra própria do PATCH,
 * documentada na wiki), o que exige tipar esses campos como `T | null`.
 */
export class UpdateTransactionDto {
  @ApiPropertyOptional({
    description: 'Tipo da transação',
    enum: TransactionType,
  })
  @IsOptional()
  @IsEnum(TransactionType, { message: 'O tipo deve ser income ou expense.' })
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Valor positivo (magnitude); o sinal é definido pelo type',
    example: 550.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O valor deve ser um número.' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  value?: number;

  @ApiPropertyOptional({
    description: 'Data da transação (ISO 8601)',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data válida.' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Categoria da transação — deve ter o mesmo type',
    example: 'd3a8e1d2-0b4c-4d5f-9e1c-3a4b5c6d7e8f',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O id da categoria deve ser um UUID válido.' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Descrição livre; envie null para limpar',
    example: 'Dízimo do mês (ajustado)',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Id do membro vinculado; envie null para remover o vínculo',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'O id do membro deve ser um UUID válido.' })
  memberId?: string | null;

  @ApiPropertyOptional({
    description:
      'Id do ministério vinculado; envie null para remover o vínculo',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'O id do ministério deve ser um UUID válido.' })
  ministryId?: string | null;
}
