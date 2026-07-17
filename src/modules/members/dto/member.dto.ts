import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  churchId!: string;

  @ApiProperty({ example: 'João da Silva' })
  name!: string;

  @ApiPropertyOptional({ example: '1990-05-20', nullable: true })
  birthDate?: Date | null;

  @ApiPropertyOptional({ example: '2010-12-01', nullable: true })
  baptismDate?: Date | null;

  @ApiPropertyOptional({ example: 'joao@exemplo.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: '(11) 99999-0000', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  updatedAt!: Date;
}
