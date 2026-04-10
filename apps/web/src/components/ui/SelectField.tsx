'use client'

import type { JSX, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  containerClassName?: string
}

const BASE_SELECT_CLASS =
  'w-full appearance-none border bg-white text-sm text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none'

const DEFAULT_SELECT_CLASS =
  'rounded-[18px] border-gray-200 px-3.5 py-3 pr-10 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.22)] focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

export function SelectField({
  containerClassName = '',
  className = '',
  children,
  ...props
}: SelectFieldProps): JSX.Element {
  return (
    <div className={['relative', containerClassName].filter(Boolean).join(' ')}>
      <select
        {...props}
        className={[BASE_SELECT_CLASS, DEFAULT_SELECT_CLASS, className].filter(Boolean).join(' ')}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}
