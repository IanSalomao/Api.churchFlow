import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { CurrentChurch } from '../../common/decorators/current-church.decorator';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { AccountService } from './account.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChurchProfileDto } from './dto/church-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna o perfil da igreja autenticada' })
  @ApiSuccessResponse(ChurchProfileDto, {
    description: 'Perfil da igreja autenticada.',
  })
  getProfile(@CurrentChurch() churchId: string) {
    return this.accountService.getProfile(churchId);
  }

  @Patch()
  @ApiOperation({
    summary:
      'Atualiza o perfil da igreja (cnpj e denomination só podem ser preenchidos aqui)',
  })
  @ApiSuccessResponse(ChurchProfileDto, {
    description: 'Perfil atualizado.',
  })
  updateProfile(
    @CurrentChurch() churchId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountService.updateProfile(churchId, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Altera a senha da conta, exigindo a senha atual' })
  @ApiSuccessResponse(MessageResponseDto, {
    description: 'Senha alterada com sucesso.',
    example: { message: 'Senha alterada com sucesso.' },
  })
  changePassword(
    @CurrentChurch() churchId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.accountService.changePassword(churchId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exclui a conta da igreja (soft delete, irreversível, acesso revogado imediatamente)',
  })
  @ApiSuccessResponse(MessageResponseDto, {
    description: 'Conta excluída com sucesso.',
    example: { message: 'Conta excluída com sucesso.' },
  })
  deleteAccount(
    @CurrentChurch() churchId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.accountService.deleteAccount(churchId, dto);
  }
}
