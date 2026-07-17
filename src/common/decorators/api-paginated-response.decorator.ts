import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationMetaDto } from '../dto/pagination-meta.dto';

interface ApiPaginatedResponseOptions {
  status?: number;
  description?: string;
}

/**
 * Documenta uma listagem paginada já embrulhada pelo TransformInterceptor:
 * `{ success: true, data: { items: T[], meta: PaginationMetaDto } }`.
 */
export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  model: TModel,
  { status = 200, description }: ApiPaginatedResponseOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            properties: {
              items: { type: 'array', items: { $ref: getSchemaPath(model) } },
              meta: { $ref: getSchemaPath(PaginationMetaDto) },
            },
          },
        },
      },
    }),
  );
}
