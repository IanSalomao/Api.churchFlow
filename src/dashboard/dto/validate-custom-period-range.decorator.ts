import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Fica no campo `period` (não em dateFrom/dateTo) para checar a presença
 * cruzada sem interferir na validação de formato desses campos — @IsOptional
 * neles já ignora @IsDateString quando ausentes fora do period=custom.
 */
export function ValidateCustomPeriodRange(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateCustomPeriodRange',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value !== 'custom') return true;
          const { dateFrom, dateTo } = args.object as {
            dateFrom?: string;
            dateTo?: string;
          };
          return Boolean(dateFrom) && Boolean(dateTo);
        },
        defaultMessage() {
          return 'dateFrom e dateTo são obrigatórios quando period é "custom".';
        },
      },
    });
  };
}
