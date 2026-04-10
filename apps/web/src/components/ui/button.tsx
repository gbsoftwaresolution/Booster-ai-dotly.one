import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { forwardRef } from 'react'

const buttonVariants = cva(
  'app-interactive app-touch-target inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[0_12px_28px_-12px_rgba(14,165,233,0.65)] hover:shadow-[0_18px_38px_-14px_rgba(14,165,233,0.55)] hover:brightness-[1.03]',
        destructive:
          'bg-destructive text-white shadow-[0_12px_24px_-12px_rgba(220,38,38,0.55)] hover:bg-destructive/90',
        outline:
          'border border-gray-200 bg-white/92 text-gray-700 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)] hover:border-gray-300 hover:bg-white',
        ghost: 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900',
        link: 'text-brand-500 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-10 px-4 text-xs',
        md: 'h-11 px-4.5 py-2.5',
        lg: 'h-12 px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
