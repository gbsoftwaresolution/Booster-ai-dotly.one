import { CardTemplate } from '@dotly/types'

export interface CardTemplateOption {
  id: CardTemplate
  label: string
  description: string
  /** Preview swatch: background + foreground colors shown in the mini card */
  bg: string
  accent: string
  textColor: string
}

export const CARD_TEMPLATES: CardTemplateOption[] = [
  {
    id: CardTemplate.MINIMAL,
    label: 'Minimal',
    description: 'Clean & white',
    bg: 'bg-white',
    accent: 'bg-gray-900',
    textColor: 'text-gray-900',
  },
  {
    id: CardTemplate.BOLD,
    label: 'Bold',
    description: 'Dark & striking',
    bg: 'bg-gray-900',
    accent: 'bg-brand-500',
    textColor: 'text-white',
  },
  {
    id: CardTemplate.CREATIVE,
    label: 'Creative',
    description: 'Gradient & vibrant',
    bg: 'bg-gradient-to-br from-brand-400 to-purple-500',
    accent: 'bg-white',
    textColor: 'text-white',
  },
  {
    id: CardTemplate.CORPORATE,
    label: 'Corporate',
    description: 'Two-column pro',
    bg: 'bg-slate-100',
    accent: 'bg-slate-700',
    textColor: 'text-slate-900',
  },
  {
    id: CardTemplate.ELEGANT,
    label: 'Elegant',
    description: 'Luxury serif',
    bg: 'bg-[#FDFAF6]',
    accent: 'bg-[#9A7B4F]',
    textColor: 'text-[#1A1410]',
  },
  {
    id: CardTemplate.DARK,
    label: 'Dark',
    description: 'Neon highlights',
    bg: 'bg-[#050505]',
    accent: 'bg-[#00E5FF]',
    textColor: 'text-[#F4F4F5]',
  },
  {
    id: CardTemplate.NEON,
    label: 'Neon',
    description: 'Vibrant & glowing',
    bg: 'bg-[#0A0A0A]',
    accent: 'bg-[#FF00FF]',
    textColor: 'text-[#FFFFFF]',
  },
  {
    id: CardTemplate.RETRO,
    label: 'Retro',
    description: 'Vintage Y2K style',
    bg: 'bg-[#F1F5F9]',
    accent: 'bg-[#FF90E8]',
    textColor: 'text-[#000000]',
  },
  {
    id: CardTemplate.GLASSMORPHISM,
    label: 'Glass',
    description: 'Deep frosted blur',
    bg: 'bg-[#0b0f19]',
    accent: 'bg-white/5 border border-white/10 backdrop-blur-xl',
    textColor: 'text-white',
  },
]
