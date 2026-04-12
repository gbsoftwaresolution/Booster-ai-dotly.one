export type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'URL' | 'SELECT'

export interface CustomField {
  id: string
  label: string
  fieldType: FieldType
  options: string[]
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface FieldFormValues {
  label: string
  fieldType: FieldType
  options: string
  displayOrder: string
}
