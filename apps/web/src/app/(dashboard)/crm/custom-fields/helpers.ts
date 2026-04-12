import type { FieldFormValues, FieldType } from './types'

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  URL: 'URL',
  SELECT: 'Dropdown (Select)',
}

export const EMPTY_FORM: FieldFormValues = {
  label: '',
  fieldType: 'TEXT',
  options: '',
  displayOrder: '0',
}
