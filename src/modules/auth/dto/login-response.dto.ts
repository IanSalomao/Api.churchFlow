import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT de acesso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token!: string;

  @ApiProperty({
    description: 'Data/hora de expiração do token, derivada do seu `exp`',
    example: '2026-08-16T12:00:00.000Z',
  })
  expiresAt!: string;
}
