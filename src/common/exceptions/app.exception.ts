import { HttpException } from '@nestjs/common';

export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * Exceção com `code` estável (SCREAMING_SNAKE_CASE, em inglês) para o cliente
 * tratar programaticamente, conforme o contrato de erro da wiki (API_docs).
 */
export class AppException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: number,
    readonly details: ErrorDetail[] | null = null,
  ) {
    super(message, status);
  }
}
