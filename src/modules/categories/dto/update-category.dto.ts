import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

// `type` continua presente (opcional) para que o service possa detectar a
// tentativa de alteração e responder 422 CATEGORY_TYPE_IMMUTABLE, em vez de
// o ValidationPipe rejeitar o campo antes mesmo de chegar ao service.
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
