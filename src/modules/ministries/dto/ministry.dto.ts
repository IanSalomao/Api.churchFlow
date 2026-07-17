import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MinistryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  churchId!: string;

  @ApiPropertyOptional({
    example: '111e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  responsibleId?: string | null;

  @ApiProperty({ example: 'Ministério de Louvor' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Ministério responsável pelo louvor e adoração.',
    nullable: true,
  })
  description?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  updatedAt!: Date;
}
