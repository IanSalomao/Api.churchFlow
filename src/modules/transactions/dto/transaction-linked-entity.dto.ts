import { ApiProperty } from '@nestjs/swagger';

/** Resumo de membro/ministério vinculado a uma transação. */
export class TransactionLinkedEntityDto {
  @ApiProperty({ example: 'b1e6c9b0-8f2a-4b3e-9c9a-1e2f3a4b5c6d' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  name!: string;

  @ApiProperty({
    description: 'true se o vínculo já foi removido (soft delete)',
    example: false,
  })
  deleted!: boolean;
}
