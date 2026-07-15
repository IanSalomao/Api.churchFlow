import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsCnpj } from '../../common/decorators/is-cnpj.decorator';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'Nome da igreja',
    example: 'Igreja Batista Central',
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome não pode ser vazio.' })
  name?: string;

  @ApiPropertyOptional({
    description: 'E-mail de login',
    example: 'contato@igrejacentral.com.br',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefone de contato',
    example: '11999999999',
  })
  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto.' })
  phone?: string;

  @ApiPropertyOptional({
    description:
      'CNPJ, validado com dígito verificador brasileiro — só preenchível aqui, não no cadastro',
    example: '11.444.777/0001-61',
  })
  @IsOptional()
  @IsString({ message: 'O CNPJ deve ser um texto.' })
  @IsCnpj({ message: 'CNPJ inválido.' })
  cnpj?: string;

  @ApiPropertyOptional({
    description: 'Denominação — só preenchível aqui, não no cadastro',
    example: 'Batista',
  })
  @IsOptional()
  @IsString({ message: 'A denominação deve ser um texto.' })
  denomination?: string;
}
