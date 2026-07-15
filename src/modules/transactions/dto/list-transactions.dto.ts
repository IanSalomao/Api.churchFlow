import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IsAfterOrEqualDate } from '../../../common/decorators/is-after-or-equal-date.decorator';
import { TransactionType } from '../../../../generated/prisma/enums';

export class ListTransactionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Busca na descrição (contains, case-insensitive)',
    example: 'dízimo',
  })
  @IsOptional()
  @IsString({ message: 'search deve ser um texto.' })
  declare search?: string;

  @ApiPropertyOptional({ description: 'Data inicial do período (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data inicial válida.' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data final do período (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data final válida.' })
  @IsAfterOrEqualDate('dateFrom', {
    message: 'dateTo não pode ser anterior a dateFrom.',
  })
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filtra por categoria' })
  @IsOptional()
  @IsUUID('4', { message: 'O id da categoria deve ser um UUID válido.' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filtra por tipo; se omitido, retorna ambos',
    enum: TransactionType,
  })
  @IsOptional()
  @IsEnum(TransactionType, { message: 'O tipo deve ser income ou expense.' })
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Campo de ordenação; prefixo "-" para decrescente',
    example: '-date',
    default: '-date',
  })
  @IsOptional()
  @IsString({ message: 'sort deve ser um texto.' })
  sort?: string;
}
