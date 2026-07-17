import { ApiProperty } from '@nestjs/swagger';

export class DashboardLinePointDto {
  @ApiProperty({
    description:
      'Início do bucket (dia "YYYY-MM-DD" ou mês "YYYY-MM-01", conforme a granularidade do período)',
    example: '2026-07-01',
  })
  date!: string;

  @ApiProperty({ example: 1500 })
  income!: number;

  @ApiProperty({ example: 620 })
  expense!: number;
}
