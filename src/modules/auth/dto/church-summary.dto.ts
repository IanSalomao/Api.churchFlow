import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChurchSummaryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'Igreja Batista Central' })
  name!: string;

  @ApiProperty({ example: 'contato@igrejacentral.com.br' })
  email!: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000', nullable: true })
  phone?: string | null;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  createdAt!: Date;
}
