import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { CardTemplate } from '@dotly/types'
import { MinimalTemplate } from './templates/MinimalTemplate'
import { BoldTemplate } from './templates/BoldTemplate'
import { CreativeTemplate } from './templates/CreativeTemplate'
import { CorporateTemplate } from './templates/CorporateTemplate'

export function CardRenderer(props: CardRendererProps) {
  switch (props.card.templateId) {
    case CardTemplate.MINIMAL:
      return <MinimalTemplate {...props} />
    case CardTemplate.BOLD:
      return <BoldTemplate {...props} />
    case CardTemplate.CREATIVE:
      return <CreativeTemplate {...props} />
    case CardTemplate.CORPORATE:
      return <CorporateTemplate {...props} />
    default:
      return <MinimalTemplate {...props} />
  }
}
