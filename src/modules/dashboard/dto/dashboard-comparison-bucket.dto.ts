import { ApiProperty } from '@nestjs/swagger';

export class DashboardComparisonBucketDto {
  @ApiProperty({
    description:
      'Início do bucket: dia 1 do mês ("YYYY-MM-01") para groupBy=month, ou o domingo que abre a semana para groupBy=week',
    example: '2026-07-01',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'Rótulo em pt-BR pronto para o eixo X do gráfico',
    example: 'Jul/26',
  })
  label!: string;

  @ApiProperty({ example: 90000 })
  income!: number;

  @ApiProperty({ example: 70000 })
  expense!: number;
}
