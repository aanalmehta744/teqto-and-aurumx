import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Group-level validator: ensures the end date is not before the start date.
 * Sets a `dateRangeInvalid` error on the group when end < start.
 * Returns null (valid) when either value is missing/unparseable so that the
 * individual `required` validators own the empty-field messaging.
 */
export function dateRangeValidator(
  startKey: string,
  endKey: string,
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startKey)?.value;
    const end = group.get(endKey)?.value;
    if (!start || !end) return null;

    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;

    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);

    return e < s ? { dateRangeInvalid: true } : null;
  };
}
