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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { TransactionDto } from './dto/transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as transações da igreja, com busca, filtros e paginação',
  })
  @ApiPaginatedResponse(TransactionDto, {
    description: 'Lista paginada de transações.',
  })
  findAll(@Query() query: ListTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma transação pelo id' })
  @ApiSuccessResponse(TransactionDto, { description: 'Transação encontrada.' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra uma nova transação' })
  @ApiSuccessResponse(TransactionDto, {
    status: HttpStatus.CREATED,
    description: 'Transação cadastrada.',
  })
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de uma transação' })
  @ApiSuccessResponse(TransactionDto, { description: 'Transação atualizada.' })
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma transação (soft delete)' })
  @ApiSuccessResponse(MessageResponseDto, {
    description: 'Transação removida.',
    example: { message: 'Transação removida.' },
  })
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
