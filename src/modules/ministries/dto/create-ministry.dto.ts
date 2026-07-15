import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMinistryDto {
  @ApiProperty({
    description: 'Nome do ministério',
    example: 'Ministério de Louvor',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição do ministério',
    example: 'Ministério responsável pelo louvor e adoração.',
  })
  @IsString({ message: 'A descrição deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Id do membro responsável pelo ministério',
    example: '111e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'O id do membro deve ser um UUID válido.' })
  @IsOptional()
  responsibleId?: string;
}
