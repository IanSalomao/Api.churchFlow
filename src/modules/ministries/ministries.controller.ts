import {
  Body,
  Controller,
  Delete,
  Get,
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
import { MinistriesService } from './ministries.service';
import { ListMinistriesDto } from './dto/list-ministries.dto';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { MinistryDto } from './dto/ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';

@ApiTags('ministries')
@ApiBearerAuth()
@Controller('ministries')
export class MinistriesController {
  constructor(private readonly ministriesService: MinistriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os ministérios da igreja, paginado e com busca por nome',
  })
  @ApiPaginatedResponse(MinistryDto, {
    description: 'Lista paginada de ministérios.',
  })
  findAll(@Query() query: ListMinistriesDto) {
    return this.ministriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um ministério pelo id' })
  @ApiSuccessResponse(MinistryDto, { description: 'Ministério encontrado.' })
  findOne(@Param('id') id: string) {
    return this.ministriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo ministério' })
  @ApiSuccessResponse(MinistryDto, {
    status: HttpStatus.CREATED,
    description: 'Ministério cadastrado.',
  })
  create(@Body() dto: CreateMinistryDto) {
    return this.ministriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de um ministério' })
  @ApiSuccessResponse(MinistryDto, { description: 'Ministério atualizado.' })
  update(@Param('id') id: string, @Body() dto: UpdateMinistryDto) {
    return this.ministriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um ministério (soft delete)' })
  @ApiSuccessResponse(MessageResponseDto, {
    description: 'Ministério removido.',
    example: { message: 'Ministério removido.' },
  })
  remove(@Param('id') id: string) {
    return this.ministriesService.remove(id);
  }
}
