import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { CardTemplate } from '@dotly/types'
import { MinimalTemplate } from './templates/MinimalTemplate'
import { BoldTemplate } from './templates/BoldTemplate'
import { CreativeTemplate } from './templates/CreativeTemplate'
import { CorporateTemplate } from './templates/CorporateTemplate'
import { ElegantTemplate } from './templates/ElegantTemplate'
import { DarkTemplate } from './templates/DarkTemplate'
import { NeonTemplate } from './templates/NeonTemplate'
import { RetroTemplate } from './templates/RetroTemplate'

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
    case CardTemplate.ELEGANT:
      return <ElegantTemplate {...props} />
    case CardTemplate.DARK:
      return <DarkTemplate {...props} />
    case CardTemplate.RETRO:
      return <RetroTemplate {...props} />
    case CardTemplate.NEON:
      return <NeonTemplate {...props} />
    default:
      return <MinimalTemplate {...props} />
  }
}
