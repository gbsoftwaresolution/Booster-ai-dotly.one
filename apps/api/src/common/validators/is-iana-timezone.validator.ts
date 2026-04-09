import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

/**
 * MED-5: Validates that a string is a valid IANA timezone identifier
 * (e.g. "America/New_York", "UTC", "Asia/Kolkata").
 *
 * Uses Intl.DateTimeFormat try/catch — if the runtime rejects the value as an
 * unknown timezone the validator fails. This works in Node 18+ (V8 ICU data
 * is always bundled in official Node builds).
 */
@ValidatorConstraint({ name: 'IsIANATimezone', async: false })
export class IsIANATimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value })
      return true
    } catch {
      return false
    }
  }

  defaultMessage(): string {
    return 'timezone must be a valid IANA timezone identifier (e.g. "America/New_York", "UTC")'
  }
}

export function IsIANATimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIANATimezoneConstraint,
    })
  }
}
