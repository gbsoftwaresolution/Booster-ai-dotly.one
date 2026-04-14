import type { JSX } from 'react'

export function StructuredData({
  data,
  id,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>
  id?: string
}): JSX.Element {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}