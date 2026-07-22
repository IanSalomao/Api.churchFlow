import { ApiProperty } from '@nestjs/swagger';

export class DashboardComparisonStatsDto {
  @ApiProperty({
    description: 'Quantidade de buckets anteriores ao último, usados na média',
    example: 5,
  })
  sampleSize!: number;

  @ApiProperty({
    description:
      'Variação percentual das entradas do último bucket vs. a média dos anteriores (null sem base de comparação)',
    example: -10.0,
    nullable: true,
  })
  incomeVsAvg!: number | null;

  @ApiProperty({
    description:
      'Variação percentual das saídas do último bucket vs. a média dos anteriores (null sem base de comparação)',
    example: 16.7,
    nullable: true,
  })
  expenseVsAvg!: number | null;
}
