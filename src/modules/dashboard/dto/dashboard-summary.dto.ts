import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Saldo acumulado (todas as transações, sem filtro de período)',
    example: 12450.5,
  })
  balance!: number;

  @ApiProperty({
    description: 'Entradas no período filtrado',
    example: 8300,
  })
  income!: number;

  @ApiProperty({
    description: 'Saídas no período filtrado (magnitude, sempre positivo)',
    example: 3200,
  })
  expense!: number;

  @ApiProperty({
    description: 'income - expense do período filtrado',
    example: 5100,
  })
  periodBalance!: number;

  @ApiProperty({ example: 128 })
  membersCount!: number;

  @ApiProperty({
    description: 'Total de transações (todas, sem filtro de período)',
    example: 342,
  })
  transactionsCount!: number;

  @ApiProperty({ example: 6 })
  ministriesCount!: number;

  @ApiProperty({
    description: 'Média do valor absoluto das transações (todas)',
    example: 218.75,
  })
  averageTicket!: number;
}
