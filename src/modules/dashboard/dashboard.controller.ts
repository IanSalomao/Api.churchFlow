import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

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
  getSummary(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getSummary(query);
  }

  @Get('charts')
  @ApiOperation({
    summary:
      'Gráfico de linha (entradas/saídas ao longo do tempo) e pizzas de entradas/saídas por categoria',
  })
  getCharts(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getCharts(query);
  }
}
