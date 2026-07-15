import { registerDecorator, ValidationOptions } from 'class-validator';

const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function calcCheckDigit(base: string, weights: number[]): number {
  const sum = weights.reduce(
    (acc, weight, index) => acc + Number(base[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Aceita CNPJ com ou sem máscara; valida os dois dígitos verificadores. */
function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  // Sequências repetidas (ex.: "11111111111111") têm dígitos verificadores
  // matematicamente válidos, mas nunca são CNPJs reais emitidos.
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const firstDigit = calcCheckDigit(digits, FIRST_DIGIT_WEIGHTS);
  const secondDigit = calcCheckDigit(
    digits.slice(0, 12) + firstDigit,
    SECOND_DIGIT_WEIGHTS,
  );

  return (
    firstDigit === Number(digits[12]) && secondDigit === Number(digits[13])
  );
}

export function IsCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCnpj',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidCnpj(value);
        },
        defaultMessage(): string {
          return 'CNPJ inválido.';
        },
      },
    });
  };
}
