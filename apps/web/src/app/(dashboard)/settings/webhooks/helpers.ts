export const ALL_EVENTS = [
  {
    value: 'lead.created',
    label: 'Lead created',
    description: 'A new lead captured from your card',
  },
  { value: 'card.viewed', label: 'Card viewed', description: 'Someone viewed your digital card' },
  { value: 'card.click', label: 'Card click', description: 'A link on your card was clicked' },
  {
    value: 'contact.stage_changed',
    label: 'Contact stage changed',
    description: 'A CRM contact moved to a new stage',
  },
  {
    value: 'contact.enriched',
    label: 'Contact enriched',
    description: 'A contact was automatically enriched',
  },
] as const
