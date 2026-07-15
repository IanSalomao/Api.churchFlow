import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Valida que a data do campo decorado não é anterior à data do campo
 * `property` no mesmo objeto. Ignora a validação se um dos dois valores
 * não estiver presente (uso combinado com @IsOptional nos dois campos).
 */
export function IsAfterOrEqualDate(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterOrEqualDate',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          if (!value || !relatedValue) return true;
          return new Date(value as string) >= new Date(relatedValue as string);
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property} não pode ser anterior a ${relatedPropertyName}.`;
        },
      },
    });
  };
}
