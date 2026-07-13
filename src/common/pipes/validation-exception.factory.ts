import { HttpStatus, ValidationError } from '@nestjs/common';
import { AppException, ErrorDetail } from '../exceptions/app.exception';

function toDetails(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...toDetails(error.children ?? [], field)];
  });
}

export function validationExceptionFactory(
  errors: ValidationError[],
): AppException {
  const details = toDetails(errors);
  return new AppException(
    'VALIDATION_ERROR',
    details[0]?.message ?? 'Dados inválidos.',
    HttpStatus.BAD_REQUEST,
    details,
  );
}
