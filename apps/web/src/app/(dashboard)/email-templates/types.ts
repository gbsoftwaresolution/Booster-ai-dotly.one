export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface TemplateFormValues {
  name: string
  subject: string
  body: string
}

export type TemplateField = keyof TemplateFormValues
