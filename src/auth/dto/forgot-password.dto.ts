import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'E-mail da conta a recuperar',
    example: 'contato@igrejacentral.com.br',
  })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;
}
