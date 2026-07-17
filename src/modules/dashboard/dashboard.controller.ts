import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardChartsDto } from './dto/dashboard-charts.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Cards de métrica (Saldo, Entradas, Saídas, Balanço) e métricas extras da tela Dashboard',
  })
  @ApiSuccessResponse(DashboardSummaryDto, {
    description: 'Métricas agregadas do período filtrado.',
  })
  getSummary(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getSummary(query);
  }

  @Get('charts')
  @ApiOperation({
    summary:
      'Gráfico de linha (entradas/saídas ao longo do tempo) e pizzas de entradas/saídas por categoria',
  })
  @ApiSuccessResponse(DashboardChartsDto, {
    description: 'Séries para os gráficos do período filtrado.',
  })
  getCharts(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getCharts(query);
  }
}
