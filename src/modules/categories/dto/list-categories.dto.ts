import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '../../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListCategoriesDto extends OmitType(PaginationQueryDto, [
  'search',
] as const) {
  @ApiPropertyOptional({
    description:
      'Filtra por tipo. Se omitido, retorna categorias de ambos os tipos.',
    enum: TransactionType,
  })
  @IsOptional()
  @IsEnum(TransactionType, {
    message: 'O tipo deve ser "income" ou "expense".',
  })
  type?: TransactionType;
}
