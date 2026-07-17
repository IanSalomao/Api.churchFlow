import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { ListMembersDto } from './dto/list-members.dto';
import { MemberDto } from './dto/member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os membros da igreja, paginado e com busca por nome',
  })
  @ApiPaginatedResponse(MemberDto, {
    description: 'Lista paginada de membros.',
  })
  findAll(@Query() query: ListMembersDto) {
    return this.membersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um membro pelo id' })
  @ApiSuccessResponse(MemberDto, { description: 'Membro encontrado.' })
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo membro' })
  @ApiSuccessResponse(MemberDto, {
    status: HttpStatus.CREATED,
    description: 'Membro cadastrado.',
  })
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de um membro' })
  @ApiSuccessResponse(MemberDto, { description: 'Membro atualizado.' })
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove um membro (soft delete)' })
  @ApiSuccessResponse(MessageResponseDto, {
    description: 'Membro removido.',
    example: { message: 'Membro removido.' },
  })
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
