import { ApiProperty } from '@nestjs/swagger';
import { ChurchSummaryDto } from './church-summary.dto';

export class RegisterResponseDto {
  @ApiProperty({
    description: 'JWT já autenticado (sessão curta, sem "lembrar-me")',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token!: string;

  @ApiProperty({ type: ChurchSummaryDto })
  church!: ChurchSummaryDto;
}
