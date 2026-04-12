import type { TemplateField, TemplateFormValues } from './types'

export const MERGE_TAGS = [
  '{{contact.name}}',
  '{{contact.email}}',
  '{{contact.company}}',
  '{{contact.title}}',
] as const

export const TEMPLATE_LIMITS: Record<TemplateField, number> = {
  name: 120,
  subject: 200,
  body: 5000,
}

export const EMPTY_FORM: TemplateFormValues = {
  name: '',
  subject: '',
  body: '',
}

export function subjectPreview(subject: string): string {
  return subject.trim() || 'No subject'
}

export function validateTemplateForm(values: TemplateFormValues): {
  values: TemplateFormValues
  fieldErrors: Partial<Record<TemplateField, string>>
} {
  const nextValues = {
    name: values.name.trim(),
    subject: values.subject.trim(),
    body: values.body.trim(),
  }

  const fieldErrors: Partial<Record<TemplateField, string>> = {}

  if (!nextValues.name) {
    fieldErrors.name = 'Template name is required.'
  } else if (nextValues.name.length < 2) {
    fieldErrors.name = 'Template name must be at least 2 characters.'
  } else if (nextValues.name.length > TEMPLATE_LIMITS.name) {
    fieldErrors.name = `Template name must be ${TEMPLATE_LIMITS.name} characters or less.`
  }

  if (!nextValues.subject) {
    fieldErrors.subject = 'Email subject is required.'
  } else if (nextValues.subject.length > TEMPLATE_LIMITS.subject) {
    fieldErrors.subject = `Email subject must be ${TEMPLATE_LIMITS.subject} characters or less.`
  }

  if (!nextValues.body) {
    fieldErrors.body = 'Email body is required.'
  } else if (nextValues.body.length < 5) {
    fieldErrors.body = 'Email body must be at least 5 characters.'
  } else if (nextValues.body.length > TEMPLATE_LIMITS.body) {
    fieldErrors.body = `Email body must be ${TEMPLATE_LIMITS.body} characters or less.`
  }

  return { values: nextValues, fieldErrors }
}
