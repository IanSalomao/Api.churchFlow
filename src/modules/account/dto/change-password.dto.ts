import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual, para confirmação' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword: string;

  @ApiProperty({
    description: 'Nova senha — mínimo de 8 caracteres',
    minLength: 8,
    example: 'novaSenhaSegura456',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  newPassword: string;
}
