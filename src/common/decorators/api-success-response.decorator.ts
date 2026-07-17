import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface ApiSuccessResponseOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
  /**
   * Sobrescreve o exemplo de `data` no /docs para este endpoint específico —
   * necessário quando vários endpoints reutilizam o mesmo DTO (ex.:
   * MessageResponseDto), já que o exemplo de um @ApiProperty é fixo por
   * classe e, sem isso, todo endpoint mostraria o mesmo texto.
   */
  example?: unknown;
}

/**
 * Documenta a resposta já embrulhada pelo TransformInterceptor
 * (`{ success: true, data: T }`), a partir de uma classe de DTO anotada
 * com @ApiProperty representando o `T`.
 */
export function ApiSuccessResponse<TModel extends Type<unknown>>(
  model: TModel,
  {
    status = 200,
    description,
    isArray = false,
    example,
  }: ApiSuccessResponseOptions = {},
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
        },
        ...(example !== undefined && {
          example: { success: true, data: example },
        }),
      },
    }),
  );
}
