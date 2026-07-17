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
import { CategoriesService } from './categories.service';
import { CategoryDto } from './dto/category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista as categorias de transação da igreja, com filtro por tipo e paginação',
  })
  @ApiPaginatedResponse(CategoryDto, {
    description: 'Lista paginada de categorias.',
  })
  findAll(@Query() query: ListCategoriesDto) {
    return this.categoriesService.findAll(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma nova categoria (o tipo é imutável após a criação)',
  })
  @ApiSuccessResponse(CategoryDto, {
    status: HttpStatus.CREATED,
    description: 'Categoria criada.',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza parcialmente uma categoria existente (exceto o tipo)',
  })
  @ApiSuccessResponse(CategoryDto, { description: 'Categoria atualizada.' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Remove uma categoria (soft delete), permitido mesmo com transações vinculadas',
  })
  @ApiSuccessResponse(MessageResponseDto, {
    description: 'Categoria excluída com sucesso.',
    example: { message: 'Categoria excluída com sucesso.' },
  })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
