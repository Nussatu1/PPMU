import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  name?: string
  size?: AvatarSize
  fallbackClassName?: string
}

/**
 * Standardized Avatar scale:
 * - xs: 24px (inline comments, dense tables)
 * - sm: 32px (default topbar / user menu trigger)
 * - md: 40px (cards, standard profile rows)
 * - lg: 56px (modal headers, user details)
 * - xl: 80px (profile edit, account page hero)
 */
const avatarSizes: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[11px]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-lg' },
  xl: { container: 'w-20 h-20', text: 'text-2xl' },
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name = 'User',
  size = 'sm',
  className,
  fallbackClassName,
  ...props
}) => {
  const [hasError, setHasError] = useState(false)
  const initial = (name?.trim()?.[0] || 'U').toUpperCase()
  const { container, text } = avatarSizes[size] || avatarSizes.sm

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden select-none',
        container,
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div
          className={cn(
            'w-full h-full rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shadow-xs',
            text,
            fallbackClassName
          )}
        >
          {initial}
        </div>
      )}
    </div>
  )
}
Avatar.displayName = 'Avatar'
