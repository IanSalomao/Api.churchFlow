import { ApiProperty } from '@nestjs/swagger';
import { DashboardCategoryBreakdownDto } from './dashboard-category-breakdown.dto';
import { DashboardLinePointDto } from './dashboard-line-point.dto';

export class DashboardChartsDto {
  @ApiProperty({
    description: 'Série temporal de entradas/saídas no período',
    type: () => DashboardLinePointDto,
    isArray: true,
  })
  line!: DashboardLinePointDto[];

  @ApiProperty({
    description: 'Entradas do período, agrupadas por categoria',
    type: () => DashboardCategoryBreakdownDto,
    isArray: true,
  })
  incomeByCategory!: DashboardCategoryBreakdownDto[];

  @ApiProperty({
    description: 'Saídas do período, agrupadas por categoria',
    type: () => DashboardCategoryBreakdownDto,
    isArray: true,
  })
  expenseByCategory!: DashboardCategoryBreakdownDto[];
}
