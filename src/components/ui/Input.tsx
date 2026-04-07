import { forwardRef, type InputHTMLAttributes, type ReactNode, useId, useState } from 'react'

import styles from './Input.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  onIconRightClick?: () => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, hint, error, iconLeft, iconRight, onIconRightClick, className = '', id, ...props },
    ref,
  ) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    const wrapperCls = [styles.wrapper, error ? styles.error : ''].filter(Boolean).join(' ')
    const inputCls = [
      styles.input,
      iconLeft ? styles.hasLeft : '',
      iconRight ? styles.hasRight : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={wrapperCls}>
        {label && (
          <label className={styles.label} htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className={styles.field}>
          {iconLeft && <span className={styles.iconLeft}>{iconLeft}</span>}
          <input ref={ref} id={inputId} className={inputCls} {...props} />
          {iconRight && (
            <span
              className={styles.iconRight}
              onClick={onIconRightClick}
              role={onIconRightClick ? 'button' : undefined}
              tabIndex={onIconRightClick ? 0 : undefined}
            >
              {iconRight}
            </span>
          )}
        </div>
        {error && <span className={styles.errorMsg}>{error}</span>}
        {hint && !error && <span className={styles.hint}>{hint}</span>}
      </div>
    )
  },
)

Input.displayName = 'Input'

/* ── PasswordInput helper ── */
export function PasswordInput(props: Omit<InputProps, 'type' | 'iconRight' | 'onIconRightClick'>) {
  const [show, setShow] = useState(false)

  const EyeIcon = show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      iconRight={EyeIcon}
      onIconRightClick={() => {
        setShow((s) => !s)
      }}
    />
  )
}
