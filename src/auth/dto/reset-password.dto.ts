import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recebido por e-mail' })
  @IsString({ message: 'O token deve ser um texto.' })
  @IsNotEmpty({ message: 'O token é obrigatório.' })
  token: string;

  @ApiProperty({
    description: 'Nova senha — mínimo de 8 caracteres',
    minLength: 8,
    example: 'novaSenhaSegura456',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  newPassword: string;
}
