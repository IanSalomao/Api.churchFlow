import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsNotEmpty, IsString } from 'class-validator';

const CONFIRMATION_PHRASE = 'EXCLUIR';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Senha atual, para confirmação' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword: string;

  @ApiProperty({
    description: 'Frase de confirmação exibida na tela',
    example: CONFIRMATION_PHRASE,
  })
  @IsString({ message: 'A frase de confirmação deve ser um texto.' })
  @Equals(CONFIRMATION_PHRASE, {
    message: 'A frase de confirmação não corresponde.',
  })
  confirmationPhrase: string;
}
