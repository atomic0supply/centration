import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

import styles from './Card.module.css'

type CardSize = 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  size?: CardSize
  hoverable?: boolean
  clickable?: boolean
  glass?: boolean
  children: ReactNode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ size = 'md', hoverable, clickable, glass, children, className = '', ...props }, ref) => {
    const cls = [
      styles.card,
      styles[size],
      hoverable ? styles.hoverable : '',
      clickable ? styles.clickable : '',
      glass ? styles.glass : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div ref={ref} className={cls} {...props}>
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'
