import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ example: 'Senha alterada com sucesso.' })
  message!: string;
}
