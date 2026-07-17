import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../../generated/prisma/enums';
import { TransactionCategorySummaryDto } from './transaction-category-summary.dto';
import { TransactionLinkedEntityDto } from './transaction-linked-entity.dto';

export class TransactionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  churchId!: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.income })
  type!: TransactionType;

  @ApiProperty({
    description: 'Valor com sinal: positivo se income, negativo se expense',
    example: 500.0,
  })
  value!: number;

  @ApiProperty({ example: '2026-07-01' })
  date!: Date;

  @ApiPropertyOptional({ example: 'Dízimo do mês', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: () => TransactionCategorySummaryDto })
  category!: TransactionCategorySummaryDto;

  @ApiPropertyOptional({
    type: () => TransactionLinkedEntityDto,
    nullable: true,
  })
  member?: TransactionLinkedEntityDto | null;

  @ApiPropertyOptional({
    type: () => TransactionLinkedEntityDto,
    nullable: true,
  })
  ministry?: TransactionLinkedEntityDto | null;
}
