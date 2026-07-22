import { ApiProperty } from '@nestjs/swagger';
import { DASHBOARD_COMPARISON_GROUP_BY_OPTIONS } from './dashboard-query.constants';
import { DashboardComparisonBucketDto } from './dashboard-comparison-bucket.dto';
import { DashboardComparisonStatsDto } from './dashboard-comparison-stats.dto';

export class DashboardComparisonDto {
  @ApiProperty({ enum: DASHBOARD_COMPARISON_GROUP_BY_OPTIONS })
  groupBy!: 'month' | 'week';

  @ApiProperty({
    description:
      'Série contínua de buckets (sem lacunas) do intervalo filtrado',
    type: () => DashboardComparisonBucketDto,
    isArray: true,
  })
  buckets!: DashboardComparisonBucketDto[];

  @ApiProperty({
    description: 'Comparação do último bucket com a média dos anteriores',
    type: () => DashboardComparisonStatsDto,
  })
  comparison!: DashboardComparisonStatsDto;
}
