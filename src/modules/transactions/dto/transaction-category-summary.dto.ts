import { ApiProperty } from '@nestjs/swagger';

export class TransactionCategorySummaryDto {
  @ApiProperty({ example: 'd3a8e1d2-0b4c-4d5f-9e1c-3a4b5c6d7e8f' })
  id!: string;

  @ApiProperty({ example: 'Dízimo' })
  name!: string;

  @ApiProperty({ example: '#22C55E' })
  color!: string;

  @ApiProperty({
    description: 'true se a categoria já foi removida (soft delete)',
    example: false,
  })
  deleted!: boolean;
}
