import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../../generated/prisma/enums';

export class CategoryDto {
  @ApiProperty({ example: 'd3a8e1d2-0b4c-4d5f-9e1c-3a4b5c6d7e8f' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  churchId!: string;

  @ApiProperty({ example: 'Dízimo' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Dízimo mensal dos membros',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({ enum: TransactionType, example: TransactionType.income })
  type!: TransactionType;

  @ApiProperty({ example: '#22C55E' })
  color!: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  updatedAt!: Date;
}
