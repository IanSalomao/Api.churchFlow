import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MinistriesService } from './ministries.service';
import { ListMinistriesDto } from './dto/list-ministries.dto';
import { CreateMinistryDto } from './dto/create-ministry.dto';
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
  findAll(@Query() query: ListMinistriesDto) {
    return this.ministriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um ministério pelo id' })
  findOne(@Param('id') id: string) {
    return this.ministriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo ministério' })
  create(@Body() dto: CreateMinistryDto) {
    return this.ministriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de um ministério' })
  update(@Param('id') id: string, @Body() dto: UpdateMinistryDto) {
    return this.ministriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um ministério (soft delete)' })
  remove(@Param('id') id: string) {
    return this.ministriesService.remove(id);
  }
}
