import { ApiProperty } from '@nestjs/swagger';

export class DashboardCategoryBreakdownDto {
  @ApiProperty({ example: 'd3a8e1d2-0b4c-4d5f-9e1c-3a4b5c6d7e8f' })
  categoryId!: string;

  @ApiProperty({ example: 'Dízimo' })
  name!: string;

  @ApiProperty({ example: '#22C55E' })
  color!: string;

  @ApiProperty({
    description: 'Soma absoluta das transações da categoria, no período',
    example: 3400,
  })
  value!: number;
}
