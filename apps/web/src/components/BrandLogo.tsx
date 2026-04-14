import Image from 'next/image'
import type { JSX } from 'react'
import { cn } from '@/lib/cn'

function getOptimizedLogoSrc(size: number): string {
  if (size <= 32) {
    return '/logos/32.png'
  }

  if (size <= 64) {
    return '/logos/64.png'
  }

  if (size <= 180) {
    return '/logos/180.png'
  }

  return '/logos/196.png'
}

interface BrandLogoProps {
  className?: string
  iconClassName?: string
  textClassName?: string
  showText?: boolean
  priority?: boolean
  size?: number
}

export function BrandLogo({
  className,
  iconClassName,
  textClassName,
  showText = true,
  priority = false,
  size = 40,
}: BrandLogoProps): JSX.Element {
  const src = getOptimizedLogoSrc(size)

  return (
    <span className={cn('flex items-center gap-3', className)}>
      <Image
        src={src}
        alt="Dotly"
        width={size}
        height={size}
        sizes={`${size}px`}
        unoptimized
        priority={priority}
        className={cn('h-auto w-auto shrink-0 object-contain', iconClassName)}
      />
      {showText ? (
        <span className={cn('text-xl font-extrabold tracking-tight text-gray-900', textClassName)}>
          Dotly<span className="text-brand-500">.one</span>
        </span>
      ) : null}
    </span>
  )
}